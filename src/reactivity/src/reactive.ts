import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from "./baseHandlers";

export const reactiveMap = new WeakMap();
export const readonlyMap = new WeakMap();
export const shallowReadonlyMap = new WeakMap();

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  RAW = "__v_raw",
}
/* 
  主函数
*/
export function reactive(target) {
  return createReactiveObject(target, reactiveMap, mutableHandlers);
}

/* 
  接受一个对象 (响应式或纯对象) 或 ref 并返回原始对象的只读代理。
  只读代理是深层的：任何被访问的嵌套 property 也是只读的
*/
export function readonly(target) {
  return createReactiveObject(target, readonlyMap, readonlyHandlers);
}
/* 
  创建一个 proxy，使其自身的 property 为只读，
  但不执行嵌套对象的深度只读转换 (暴露原始值)。
*/
export function shallowReadonly(target) {
  return createReactiveObject(
    target,
    shallowReadonlyMap,
    shallowReadonlyHandlers
  );
}
/* 
  判断是否是reactive或者readonly
*/
export function isProxy(value) {
  return isReactive(value) || isReadonly(value);
}
/* 
  这个判断比较简单
  判断这个属性__v_isReadonly，是否为TRUE
*/
export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY];
}
/* 
  // 如果 value 是 proxy 的话
  // 会触发 get 操作，而在 createGetter 里面会判断
  // 如果 value 是普通对象的话
  // 那么会返回 undefined ，那么就需要转换成布尔值
   __v_isReactive
*/
export function isReactive(value) {
  return !!value[ReactiveFlags.IS_REACTIVE];
}
/*  
  如果 value 是proxy 的话 ,那么直接返回就可以了
  因为会触发 createGetter 内的逻辑
  如果 value 是普通对象的话，
  我们就应该返回普通对象
  只要不是 proxy ，只要是得到的 undefined 的话，那么就一定是普通对象
  TODO 这里和源码里面实现的不一样，不确定后面会不会有问题
  __v_raw
  函数作用： 返回 reactive或者readonly 代理的原始对象
*/
export function toRaw(value) {
  if (!value[ReactiveFlags.RAW]) {
    return value;
  }

  return value[ReactiveFlags.RAW];
}

/* 
  这里是核心逻辑
  reactive，shallowReactive，readonly，shallowReadonly这4个API 都是用下面这个函数实现的
*/
function createReactiveObject(target, proxyMap, baseHandlers) {
  // 核心就是 proxy
  // 目的是可以侦听到用户 get 或者 set 的动作

  // 如果命中的话就直接返回就好了
  // 使用缓存做的优化点
  /* 
    使用Map做缓存机制
  */
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const proxy = new Proxy(target, baseHandlers);

  // 把创建好的 proxy 给存起来，
  proxyMap.set(target, proxy);
  return proxy;
}
