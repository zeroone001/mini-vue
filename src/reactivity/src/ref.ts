import { trackEffects, triggerEffects, isTracking } from "./effect";
import { createDep } from "./dep";
import { isObject, hasChanged, isArray } from "../../shared";
import { reactive } from "./reactive";
/* 
  如果是引用类型，使用reactive进行封装
  如果是基础类型，使用ES6的class中的setter 和 getter 进行拦截

*/
declare const RefSymbol: unique symbol
export interface Ref<T = any> {
  value: T
  /**
   * Type differentiator only.
   * We need this to be in public d.ts but don't want it to show up in IDE
   * autocomplete, so we use a private Symbol instead.
   */
  [RefSymbol]: true
  /**
   * @internal
   */
  _shallow?: boolean
}
export class RefImpl {
  private _rawValue: any;
  private _value: any;
  public dep;
  /* 用以isRef类型判断 */
  public __v_isRef = true;
  /* value 是原始值 */
  constructor(value) {
    this._rawValue = value;
    // 看看value 是不是一个对象，如果是一个对象的话
    // 那么需要用 reactive 包裹一下
    this._value = convert(value);
    this.dep = createDep();
  }

  get value() {
    // 收集依赖
    trackRefValue(this);
    /* 返回数据 */
    return this._value;
  }

  set value(newValue) {
    // 当新的值不等于老的值的话，
    // 那么才需要触发依赖
    if (hasChanged(newValue, this._rawValue)) {
      // 更新值
      this._value = convert(newValue);
      this._rawValue = newValue;
      // 触发依赖
      triggerRefValue(this);
    }
  }
}

export function ref(value) {
  return createRef(value);
}
/* 
  也就是说，如果传入的是对象，使用reactive包装

*/
function convert(value) {
  return isObject(value) ? reactive(value) : value;
}

function createRef(value) {
  const refImpl = new RefImpl(value);

  return refImpl;
}

export function triggerRefValue(ref) {
  triggerEffects(ref.dep);
}

export function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}

// 这个函数的目的是
// 帮助解构 ref
// 比如在 template 中使用 ref 的时候，直接使用就可以了
// 例如： const count = ref(0) -> 在 template 中使用的话 可以直接 count
// 解决方案就是通过 proxy 来对 ref 做处理

const shallowUnwrapHandlers = {
  get(target, key, receiver) {
    // 如果里面是一个 ref 类型的话，那么就返回 .value
    // 如果不是的话，那么直接返回value 就可以了
    return unRef(Reflect.get(target, key, receiver));
  },
  set(target, key, value, receiver) {
    const oldValue = target[key];
    if (isRef(oldValue) && !isRef(value)) {
      return (target[key].value = value);
    } else {
      return Reflect.set(target, key, value, receiver);
    }
  },
};

// 这里没有处理 objectWithRefs 是 reactive 类型的时候
// TODO reactive 里面如果有 ref 类型的 key 的话， 那么也是不需要调用 ref .value 的 
// （but 这个逻辑在 reactive 里面没有实现）
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, shallowUnwrapHandlers);
}

// 把 ref 里面的值拿到
/* 
  这个判断很简单，就是拿到里面的值
*/
export function unref(ref) {
  return isRef(ref) ? ref.value : ref;
}
/* 检查是否是Ref对象，其实就是判断的私有属性 __v_isRef */
export function isRef(value) {
  return !!value.__v_isRef;
}


/* 类型声明 */
export type ToRef<T> = [T] extends [Ref] ? T : Ref<T>

/* 
可以用来为源响应式对象上的某个 property 新创建一个 ref。
然后，ref 可以被传递，它会保持对其源 property 的响应式连接。 
*/
/* 
  接受两个参数
*/
export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K
): ToRef<T[K]> {
  const val = object[key]
  /* 
    如果本身就是ref类型，那么直接返回
    实例化类ObjectRefImpl，创建一个ref并返回
  */
  return isRef(val) ? val : (new ObjectRefImpl(object, key) as any)
}

class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true

  constructor(private readonly _object: T, private readonly _key: K) {}

  get value() {
    return this._object[this._key]
  }

  set value(newVal) {
    this._object[this._key] = newVal
  }
}


export function toRefs(object) {
  // if (__DEV__ && !isProxy(object)) {
  //   console.warn(`toRefs() expects a reactive object but received a plain one.`)
  // }
  /* 
    首先判断是否为数组
    
  */
  const ret: any = isArray(object) ? new Array(object.length) : {}
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
  return ret
}