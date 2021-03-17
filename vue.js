class Vue {
    constructor(options) {
        this.$data = options.data

        // 首先进行数据劫持
        Observer(this.$data)

        // 数据代理 --- 把this.$data的属性 绑定到this上
        Object.keys(this.$data).forEach(key => {
            let value = this.$data[key]
            defineProperty(this, key, value)
        })

        // 模板编译
        Compile(options.el, this)
    }
}

// 数据劫持
function Observer(obj) {
    // 这是递归的终止条件
    if(!obj || typeof obj !== 'object') {
        return
    }
    // 遍历所有的属性
    Object.keys(obj).forEach(key => {
        // 取这个属性值
        let value = obj[key]
        // 当这个属性值还是对象的时候 进行递归操作，为每一层都进行数据劫持
        Observer(value)

        // 数据劫持
        defineProperty(obj, key, value)
    })
}

// 封装 因为在数据代理和数据劫持的时候都用到了
function defineProperty(obj, key, value) {
    let dep = new Dep()
    Object.defineProperty(obj, key, {
        // 可枚举
        enumerable: true,
        // 可删除
        configurable: true,
        // 获取值
        get() {
            if (Dep.target) {
                dep.addSubs(Dep.target)
            }
            return value
        },
        // 改变值
        set(v) {
            value = v
            // 重新赋值的时候也要进行数据劫持
            Observer(value)
            // 通知订阅者更新数据
            dep.notify()
        }
    })
}

// 模板编译
function Compile(el, vm) {
    // 获取挂载点
    vm.$el = document.querySelector(el)

    // 存储到内存碎片中
    const fg = document.createDocumentFragment()

    // 循环遍历节点 存储到内存碎片中
    while ((childNode = vm.$el.firstChild)) {
        fg.appendChild(childNode)
    }


    // 中间进行数据替换
    replace(fg)

    // 把内存中的节点还原回去
    vm.$el.appendChild(fg)


    function replace(node) {
        let regMustache = /\{\{\s*(\S+)\s*\}\}/
        // 判断是不是文本节点
        if (node.nodeType === 3) {
            // 获取节点的文本
            const textValue = node.textContent

            // 正则匹配提取数据
            execResult = regMustache.exec(textValue)

            if (execResult) {
                // 获取到数据 并进行替换
                const value = execResult[1].split('.').reduce((newObj, k) => newObj[k], vm)
                // 更新数据
                node.textContent = textValue.replace(regMustache, value)
                // 在更新数据的时候 创建订阅者
                new Watcher(vm, execResult[1], (newValue) => {
                    node.textContent = textValue.replace(regMustache, newValue)
                })
            }
        }

        // 判断是不是元素节点 和 input
        if (node.nodeType === 1 && node.tagName.toUpperCase() === 'INPUT') {
            // 遍历属性
            let attributes = Array.from(node.attributes)
            let findResult = attributes.find(item => item.name === 'v-model')
            if(findResult) {
                const textValue = findResult.value
                node.value = textValue.split('.').reduce((newObj, k) => newObj[k], vm)

                // 创建watcher实例
                new Watcher(vm, textValue, (newValue) => {
                    node.value = newValue
                })

                // input添加事件监听函数
                node.addEventListener('input', (e) => {
                    const keyArr = textValue.split('.')
                    const obj = keyArr.slice(0, keyArr.length - 1).reduce((newObj, k) => newObj[k], vm)
                    obj[keyArr[keyArr.length - 1]] = e.target.value
                })
            }
        }

        node.childNodes.forEach(child => replace(child))

    }
}

// 进行依赖收集
class Dep {
    // 初始化一个数组用于存所有的订阅者
    constructor() {
        this.subs = []
    }

    // 添加订阅者
    addSubs(watcher) {
        this.subs.push(watcher)
    }

    // 通知订阅者更新数据呗
    notify() {
        this.subs.forEach(watcher => watcher.update())
    }
}

// 订阅者
class Watcher {
    constructor(vm, key, cb) {
        this.vm = vm
        this.key = key
        this.cb = cb

        Dep.target = this
        key.split('.').reduce((newObj, k) => newObj[k], vm)
        Dep.target = null
    }

    update() {
        let value = this.key.split('.').reduce((newObj, k) => newObj[k], this.vm)
        this.cb(value)
    }
}
