/*!
* CubicBezier Easing v1.0.18 (https://github.com/thednp/CubicBezier)
* Copyright 2015-2021 © thednp
* A simple cubic-bezier easing functions factory for KUTE.js, developed with ES6+ and based on UnitBezier
* Licensed under MIT (https://github.com/thednp/CubicBezier/blob/master/LICENSE)
*/
/**
 * Creates cubic-bezier easing functions.
 *
 * @class
 */
class CubicBezier {
  /**
   * @constructor
   * @param {number} p1x - first point horizontal position
   * @param {number} p1y - first point vertical position
   * @param {number} p2x - second point horizontal position
   * @param {number} p2y - second point vertical position
   * @param {string=} functionName - an optional function name
   * @returns {(t: number) => number} a new CubicBezier easing function
   */
  constructor(p1x, p1y, p2x, p2y, functionName) {
    // pre-calculate the polynomial coefficients
    // First and last control points are implied to be (0,0) and (1.0, 1.0)
  
    /** @type {number} */
    this.cx = 3.0 * p1x;
  
    /** @type {number} */
    this.bx = 3.0 * (p2x - p1x) - this.cx;

    /** @type {number} */
    this.ax = 1.0 - this.cx - this.bx;
    
    /** @type {number} */
    this.cy = 3.0 * p1y;
  
    /** @type {number} */
    this.by = 3.0 * (p2y - p1y) - this.cy;
  
    /** @type {number} */
    this.ay = 1.0 - this.cy - this.by;
    
    /** @type {(t: number) => number} */
    const BezierEasing = (t) => this.sampleCurveY(this.solveCurveX(t));

    // this function needs a name
    Object.defineProperty(BezierEasing, 'name', { writable: true });
    BezierEasing.name = functionName || `cubic-bezier(${[p1x, p1y, p2x, p2y]})`;

    return BezierEasing;
  }

  /**
   * @param {number} t - progress [0-1]
   * @return {number} - sampled X value
   */
  sampleCurveX(t) {
    return ((this.ax * t + this.bx) * t + this.cx) * t;
  }

  /**
   * @param {number} t - progress [0-1]
   * @return {number} - sampled Y value
   */
  sampleCurveY(t) {
    return ((this.ay * t + this.by) * t + this.cy) * t;
  }

  /**
   * @param {number} t - progress [0-1]
   * @return {number} - sampled curve derivative X value
   */
  sampleCurveDerivativeX(t) {
    return (3.0 * this.ax * t + 2.0 * this.bx) * t + this.cx;
  }

  /**
   * @param {number} x - progress [0-1]
   * @return {number} - solved curve X value
   */
  solveCurveX(x) {
    let t0;
    let t1;
    let t2;
    let x2;
    let d2;
    let i;
    const epsilon = 1e-5; // Precision

    // First try a few iterations of Newton's method -- normally very fast.
    for (t2 = x, i = 0; i < 32; i += 1) {
      x2 = this.sampleCurveX(t2) - x;
      if (Math.abs(x2) < epsilon) return t2;
      d2 = this.sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < epsilon) break;
      t2 -= x2 / d2;
    }

    // No solution found - use bi-section
    t0 = 0.0;
    t1 = 1.0;
    t2 = x;

    if (t2 < t0) return t0;
    if (t2 > t1) return t1;

    while (t0 < t1) {
      x2 = this.sampleCurveX(t2);
      if (Math.abs(x2 - x) < epsilon) return t2;
      if (x > x2) t0 = t2;
      else t1 = t2;

      t2 = (t1 - t0) * 0.5 + t0;
    }

    // Give up
    return t2;
  }
}

var version$1 = "1.0.18";

// @ts-ignore

/**
 * A global namespace for library version.
 * @type {string}
 */
const Version$1 = version$1;

Object.assign(CubicBezier, { Version: Version$1 });/**
 * The KUTE.js Execution Context
 */
const KEC = {};const Tweens = [];let gl0bal;

if (typeof global !== 'undefined') gl0bal = global;
else if (typeof window !== 'undefined') gl0bal = window.self;
else gl0bal = {};

const globalObject = gl0bal;// KUTE.js INTERPOLATE FUNCTIONS
// =============================
const interpolate = {};// schedule property specific function on animation start
// link property update function to KUTE.js execution context
const onStart = {};// Include a performance.now polyfill.
// source https://github.com/tweenjs/tween.js/blob/master/src/Now.ts
let performanceNow;

// In node.js, use process.hrtime.
// eslint-disable-next-line
// @ts-ignore
if (typeof self === 'undefined' && typeof process !== 'undefined' && process.hrtime) {
  performanceNow = () => {
    // eslint-disable-next-line
		// @ts-ignore
    const time = process.hrtime();

    // Convert [seconds, nanoseconds] to milliseconds.
    return time[0] * 1000 + time[1] / 1000000;
  };
} else if (typeof self !== 'undefined' && self.performance !== undefined && self.performance.now !== undefined) {
  // In a browser, use self.performance.now if it is available.
  // This must be bound, because directly assigning this function
  // leads to an invocation exception in Chrome.
  performanceNow = self.performance.now.bind(self.performance);
} else if (typeof Date !== 'undefined' && Date.now) {
  // Use Date.now if it is available.
  performanceNow = Date.now;
} else {
  // Otherwise, use 'new Date().getTime()'.
  performanceNow = () => new Date().getTime();
}

const now = performanceNow;const Time = {};
Time.now = now;

// eslint-disable-next-line import/no-mutable-exports -- impossible to satisfy
let Tick = 0;

/**
 *
 * @param {number | Date} time
 */
const Ticker = (time) => {
  let i = 0;
  while (i < Tweens.length) {
    if (Tweens[i].update(time)) {
      i += 1;
    } else {
      Tweens.splice(i, 1);
    }
  }
  Tick = requestAnimationFrame(Ticker);
};

// stop requesting animation frame
function stop() {
  setTimeout(() => { // re-added for #81
    if (!Tweens.length && Tick) {
      cancelAnimationFrame(Tick);
      Tick = null;
      Object.keys(onStart).forEach((obj) => {
        if (typeof (onStart[obj]) === 'function') {
          if (KEC[obj]) delete KEC[obj];
        } else {
          Object.keys(onStart[obj]).forEach((prop) => {
            if (KEC[prop]) delete KEC[prop];
          });
        }
      });

      Object.keys(interpolate).forEach((i) => {
        if (KEC[i]) delete KEC[i];
      });
    }
  }, 64);
}

// render update functions
// =======================
const Render = {
  Tick, Ticker, Tweens, Time,
};
Object.keys(Render).forEach((blob) => {
  if (!KEC[blob]) {
    KEC[blob] = blob === 'Time' ? Time.now : Render[blob];
  }
});

globalObject._KUTE = KEC;// all supported properties
const supportedProperties = {};const defaultValues = {};const defaultOptions$1 = {
  duration: 700,
  delay: 0,
  easing: 'linear',
  repeat: 0,
  repeatDelay: 0,
  yoyo: false,
  resetStart: false,
  offset: 0,
};// used in preparePropertiesObject
const prepareProperty = {};// check current property value when .to() method is used
const prepareStart = {};// checks for differences between the processed start and end values,
// can be set to make sure start unit and end unit are same,
// stack transforms, process SVG paths,
// any type of post processing the component needs
const crossCheck = {};// schedule property specific function on animation complete
const onComplete = {};// link properties to interpolate functions
const linkProperty = {};const Objects = {
  supportedProperties,
  defaultValues,
  defaultOptions: defaultOptions$1,
  prepareProperty,
  prepareStart,
  crossCheck,
  onStart,
  onComplete,
  linkProperty,
};// util - a general object for utils like rgbToHex, processEasing
const Util = {};/**
 * KUTE.add(Tween)
 *
 * @param {KUTE.Tween} tw a new tween to add
 */
const add = (tw) => Tweens.push(tw);/**
 * KUTE.remove(Tween)
 *
 * @param {KUTE.Tween} tw a new tween to add
 */
const remove = (tw) => {
  const i = Tweens.indexOf(tw);
  if (i !== -1) Tweens.splice(i, 1);
};/**
 * KUTE.add(Tween)
 *
 * @return {KUTE.Tween[]} tw a new tween to add
 */
const getAll = () => Tweens;/**
 * KUTE.removeAll()
 */
const removeAll = () => { Tweens.length = 0; };/**
 * linkInterpolation
 * @this {KUTE.Tween}
 */
function linkInterpolation() { // DON'T change
  Object.keys(linkProperty).forEach((component) => {
    const componentLink = linkProperty[component];
    const componentProps = supportedProperties[component];

    Object.keys(componentLink).forEach((fnObj) => {
      if (typeof (componentLink[fnObj]) === 'function' // ATTR, colors, scroll, boxModel, borderRadius
          && Object.keys(this.valuesEnd).some((i) => (componentProps && componentProps.includes(i))
          || (i === 'attr' && Object.keys(this.valuesEnd[i]).some((j) => componentProps && componentProps.includes(j))))) {
        if (!KEC[fnObj]) KEC[fnObj] = componentLink[fnObj];
      } else {
        Object.keys(this.valuesEnd).forEach((prop) => {
          const propObject = this.valuesEnd[prop];
          if (propObject instanceof Object) {
            Object.keys(propObject).forEach((i) => {
              if (typeof (componentLink[i]) === 'function') { // transformCSS3
                if (!KEC[i]) KEC[i] = componentLink[i];
              } else {
                Object.keys(componentLink[fnObj]).forEach((j) => {
                  if (componentLink[i] && typeof (componentLink[i][j]) === 'function') { // transformMatrix
                    if (!KEC[j]) KEC[j] = componentLink[i][j];
                  }
                });
              }
            });
          }
        });
      }
    });
  });
}const internals = {
  add,
  remove,
  getAll,
  removeAll,
  stop,
  linkInterpolation,
};/**
 * getInlineStyle
 * Returns the transform style for element from
 * cssText. Used by for the `.to()` static method.
 *
 * @param {Element} el target element
 * @returns {object}
 */
function getInlineStyle(el) {
  // if the scroll applies to `window` it returns as it has no styling
  if (!el.style) return false;
  // the cssText | the resulting transform object
  const css = el.style.cssText.replace(/\s/g, '').split(';');
  const transformObject = {};
  const arrayFn = ['translate3d', 'translate', 'scale3d', 'skew'];

  css.forEach((cs) => {
    if (/transform/i.test(cs)) {
      // all transform properties
      const tps = cs.split(':')[1].split(')');
      tps.forEach((tpi) => {
        const tpv = tpi.split('(');
        const tp = tpv[0];
        // each transform property
        const tv = tpv[1];
        if (!/matrix/.test(tp)) {
          transformObject[tp] = arrayFn.includes(tp) ? tv.split(',') : tv;
        }
      });
    }
  });

  return transformObject;
}/**
 * getStyleForProperty
 *
 * Returns the computed style property for element for .to() method.
 * Used by for the `.to()` static method.
 *
 * @param {Element} elem
 * @param {string} propertyName
 * @returns {string}
 */
function getStyleForProperty(elem, propertyName) {
  let result = defaultValues[propertyName];
  const styleAttribute = elem.style;
  const computedStyle = getComputedStyle(elem) || elem.currentStyle;
  const styleValue = styleAttribute[propertyName] && !/auto|initial|none|unset/.test(styleAttribute[propertyName])
    ? styleAttribute[propertyName]
    : computedStyle[propertyName];

  if (propertyName !== 'transform' && (propertyName in computedStyle || propertyName in styleAttribute)) {
    result = styleValue;
  }

  return result;
}/**
 * prepareObject
 *
 * Returns all processed valuesStart / valuesEnd.
 *
 * @param {Element} obj the values start/end object
 * @param {string} fn toggles between the two
 */
function prepareObject(obj, fn) { // this, props object, type: start/end
  const propertiesObject = fn === 'start' ? this.valuesStart : this.valuesEnd;

  Object.keys(prepareProperty).forEach((component) => {
    const prepareComponent = prepareProperty[component];
    const supportComponent = supportedProperties[component];

    Object.keys(prepareComponent).forEach((tweenCategory) => {
      const transformObject = {};

      Object.keys(obj).forEach((tweenProp) => {
        // scroll, opacity, other components
        if (defaultValues[tweenProp] && prepareComponent[tweenProp]) {
          propertiesObject[tweenProp] = prepareComponent[tweenProp]
            .call(this, tweenProp, obj[tweenProp]);

        // transform
        } else if (!defaultValues[tweenCategory] && tweenCategory === 'transform'
          && supportComponent.includes(tweenProp)) {
          transformObject[tweenProp] = obj[tweenProp];

        // allow transformFunctions to work with preprocessed input values
        } else if (!defaultValues[tweenProp] && tweenProp === 'transform') {
          propertiesObject[tweenProp] = obj[tweenProp];

        // colors, boxModel, category
        } else if (!defaultValues[tweenCategory]
          && supportComponent && supportComponent.includes(tweenProp)) {
          propertiesObject[tweenProp] = prepareComponent[tweenCategory]
            .call(this, tweenProp, obj[tweenProp]);
        }
      });

      // we filter out older browsers by checking Object.keys
      if (Object.keys(transformObject).length) {
        propertiesObject[tweenCategory] = prepareComponent[tweenCategory]
          .call(this, tweenCategory, transformObject);
      }
    });
  });
}/**
 * getStartValues
 *
 * Returns the start values for to() method.
 * Used by for the `.to()` static method.
 *
 * @this {KUTE.Tween} the tween instance
 */
function getStartValues() {
  const startValues = {};
  const currentStyle = getInlineStyle(this.element);

  Object.keys(this.valuesStart).forEach((tweenProp) => {
    Object.keys(prepareStart).forEach((component) => {
      const componentStart = prepareStart[component];

      Object.keys(componentStart).forEach((tweenCategory) => {
        // clip, opacity, scroll
        if (tweenCategory === tweenProp && componentStart[tweenProp]) {
          startValues[tweenProp] = componentStart[tweenCategory]
            .call(this, tweenProp, this.valuesStart[tweenProp]);
        // find in an array of properties
        } else if (supportedProperties[component]
          && supportedProperties[component].includes(tweenProp)) {
          startValues[tweenProp] = componentStart[tweenCategory]
            .call(this, tweenProp, this.valuesStart[tweenProp]);
        }
      });
    });
  });

  // stack transformCSS props for .to() chains
  // also add to startValues values from previous tweens
  Object.keys(currentStyle).forEach((current) => {
    if (!(current in this.valuesStart)) {
      startValues[current] = currentStyle[current] || defaultValues[current];
    }
  });

  this.valuesStart = {};
  prepareObject.call(this, startValues, 'start');
}var Process = {
  getInlineStyle,
  getStyleForProperty,
  getStartValues,
  prepareObject,
};const connect = {};
/** @type {KUTE.TweenBase | KUTE.Tween | KUTE.TweenExtra} */
connect.tween = null;
connect.processEasing = null;const Easing = {
  linear: new CubicBezier(0, 0, 1, 1, 'linear'),
  easingSinusoidalIn: new CubicBezier(0.47, 0, 0.745, 0.715, 'easingSinusoidalIn'),
  easingSinusoidalOut: new CubicBezier(0.39, 0.575, 0.565, 1, 'easingSinusoidalOut'),
  easingSinusoidalInOut: new CubicBezier(0.445, 0.05, 0.55, 0.95, 'easingSinusoidalInOut'),

  easingQuadraticIn: new CubicBezier(0.550, 0.085, 0.680, 0.530, 'easingQuadraticIn'),
  easingQuadraticOut: new CubicBezier(0.250, 0.460, 0.450, 0.940, 'easingQuadraticOut'),
  easingQuadraticInOut: new CubicBezier(0.455, 0.030, 0.515, 0.955, 'easingQuadraticInOut'),

  easingCubicIn: new CubicBezier(0.55, 0.055, 0.675, 0.19, 'easingCubicIn'),
  easingCubicOut: new CubicBezier(0.215, 0.61, 0.355, 1, 'easingCubicOut'),
  easingCubicInOut: new CubicBezier(0.645, 0.045, 0.355, 1, 'easingCubicInOut'),

  easingQuarticIn: new CubicBezier(0.895, 0.03, 0.685, 0.22, 'easingQuarticIn'),
  easingQuarticOut: new CubicBezier(0.165, 0.84, 0.44, 1, 'easingQuarticOut'),
  easingQuarticInOut: new CubicBezier(0.77, 0, 0.175, 1, 'easingQuarticInOut'),

  easingQuinticIn: new CubicBezier(0.755, 0.05, 0.855, 0.06, 'easingQuinticIn'),
  easingQuinticOut: new CubicBezier(0.23, 1, 0.32, 1, 'easingQuinticOut'),
  easingQuinticInOut: new CubicBezier(0.86, 0, 0.07, 1, 'easingQuinticInOut'),

  easingExponentialIn: new CubicBezier(0.95, 0.05, 0.795, 0.035, 'easingExponentialIn'),
  easingExponentialOut: new CubicBezier(0.19, 1, 0.22, 1, 'easingExponentialOut'),
  easingExponentialInOut: new CubicBezier(1, 0, 0, 1, 'easingExponentialInOut'),

  easingCircularIn: new CubicBezier(0.6, 0.04, 0.98, 0.335, 'easingCircularIn'),
  easingCircularOut: new CubicBezier(0.075, 0.82, 0.165, 1, 'easingCircularOut'),
  easingCircularInOut: new CubicBezier(0.785, 0.135, 0.15, 0.86, 'easingCircularInOut'),

  easingBackIn: new CubicBezier(0.6, -0.28, 0.735, 0.045, 'easingBackIn'),
  easingBackOut: new CubicBezier(0.175, 0.885, 0.32, 1.275, 'easingBackOut'),
  easingBackInOut: new CubicBezier(0.68, -0.55, 0.265, 1.55, 'easingBackInOut'),
};

/**
 * Returns a valid `easingFunction`.
 *
 * @param {KUTE.easingFunction | string} fn function name or constructor name
 * @returns {KUTE.easingFunction} a valid easingfunction
 */
function processBezierEasing(fn) {
  if (typeof fn === 'function') {
    return fn;
  } if (typeof (Easing[fn]) === 'function') {
    return Easing[fn];
  } if (/bezier/.test(fn)) {
    const bz = fn.replace(/bezier|\s|\(|\)/g, '').split(',');
    return new CubicBezier(bz[0] * 1, bz[1] * 1, bz[2] * 1, bz[3] * 1); // bezier easing
  }
  // if (/elastic|bounce/i.test(fn)) {
  //   throw TypeError(`KUTE - CubicBezier doesn't support ${fn} easing.`);
  // }
  return Easing.linear;
}

connect.processEasing = processBezierEasing;/**
 * selector
 *
 * A selector utility for KUTE.js.
 *
 * @param {KUTE.selectorType} el target(s) or string selector
 * @param {boolean | number} multi when true returns an array/collection of elements
 * @returns {Element | Element[] | null}
 */
function selector(el, multi) {
  try {
    let requestedElem;
    let itemsArray;
    if (multi) {
      itemsArray = el instanceof Array && el.every((x) => x instanceof Element);
      requestedElem = el instanceof HTMLCollection || el instanceof NodeList || itemsArray
        ? el : document.querySelectorAll(el);
    } else {
      requestedElem = el instanceof Element || el === window // scroll
        ? el : document.querySelector(el);
    }
    return requestedElem;
  } catch (e) {
    throw TypeError(`KUTE.js - Element(s) not found: ${el}.`);
  }
}function queueStart() {
  // fire onStart actions
  Object.keys(onStart).forEach((obj) => {
    if (typeof (onStart[obj]) === 'function') {
      onStart[obj].call(this, obj); // easing functions
    } else {
      Object.keys(onStart[obj]).forEach((prop) => {
        onStart[obj][prop].call(this, prop);
      });
    }
  });

  // add interpolations
  linkInterpolation.call(this);
}/**
 * The `TweenBase` constructor creates a new `Tween` object
 * for a single `HTMLElement` and returns it.
 *
 * `TweenBase` is meant to be used with pre-processed values.
 */
class TweenBase {
  /**
   * @param {Element} targetElement the target element
   * @param {KUTE.tweenProps} startObject the start values
   * @param {KUTE.tweenProps} endObject the end values
   * @param {KUTE.tweenOptions} opsObject the end values
   * @returns {TweenBase} the resulting Tween object
   */
  constructor(targetElement, startObject, endObject, opsObject) {
    // element animation is applied to
    this.element = targetElement;

    /** @type {boolean} */
    this.playing = false;
    /** @type {number?} */
    this._startTime = null;
    /** @type {boolean} */
    this._startFired = false;

    // type is set via KUTE.tweenProps
    this.valuesEnd = endObject;
    this.valuesStart = startObject;

    // OPTIONS
    const options = opsObject || {};
    // internal option to process inline/computed style at start instead of init
    // used by to() method and expects object : {} / false
    this._resetStart = options.resetStart || 0;
    // you can only set a core easing function as default
    /** @type {KUTE.easingOption} */
    this._easing = typeof (options.easing) === 'function' ? options.easing : connect.processEasing(options.easing);
    /** @type {number} */
    this._duration = options.duration || defaultOptions$1.duration; // duration option | default
    /** @type {number} */
    this._delay = options.delay || defaultOptions$1.delay; // delay option | default

    // set other options
    Object.keys(options).forEach((op) => {
      const internalOption = `_${op}`;
      if (!(internalOption in this)) this[internalOption] = options[op];
    });

    // callbacks should not be set as undefined
    // this._onStart = options.onStart
    // this._onUpdate = options.onUpdate
    // this._onStop = options.onStop
    // this._onComplete = options.onComplete

    // queue the easing
    const easingFnName = this._easing.name;
    if (!onStart[easingFnName]) {
      onStart[easingFnName] = function easingFn(prop) {
        if (!KEC[prop] && prop === this._easing.name) KEC[prop] = this._easing;
      };
    }

    return this;
  }

  /**
   * Starts tweening
   * @param {number?} time the tween start time
   * @returns {TweenBase} this instance
   */
  start(time) {
    // now it's a good time to start
    add(this);
    this.playing = true;

    this._startTime = typeof time !== 'undefined' ? time : KEC.Time();
    this._startTime += this._delay;

    if (!this._startFired) {
      if (this._onStart) {
        this._onStart.call(this);
      }

      queueStart.call(this);

      this._startFired = true;
    }

    if (!Tick) Ticker();
    return this;
  }

  /**
   * Stops tweening
   * @returns {TweenBase} this instance
   */
  stop() {
    if (this.playing) {
      remove(this);
      this.playing = false;

      if (this._onStop) {
        this._onStop.call(this);
      }
      this.close();
    }
    return this;
  }

  /**
   * Trigger internal completion callbacks.
   */
  close() {
    // scroll|transformMatrix need this
    Object.keys(onComplete).forEach((component) => {
      Object.keys(onComplete[component]).forEach((toClose) => {
        onComplete[component][toClose].call(this, toClose);
      });
    });
    // when all animations are finished, stop ticking after ~3 frames
    this._startFired = false;
    stop.call(this);
  }

  /**
   * Schedule another tween instance to start once this one completes.
   * @param {KUTE.chainOption} args the tween animation start time
   * @returns {TweenBase} this instance
   */
  chain(args) {
    this._chain = [];
    this._chain = args.length ? args : this._chain.concat(args);
    return this;
  }

  /**
   * Stop tweening the chained tween instances.
   */
  stopChainedTweens() {
    if (this._chain && this._chain.length) this._chain.forEach((tw) => tw.stop());
  }

  /**
   * Update the tween on each tick.
   * @param {number} time the tick time
   * @returns {boolean} this instance
   */
  update(time) {
    const T = time !== undefined ? time : KEC.Time();

    let elapsed;

    if (T < this._startTime && this.playing) { return true; }

    elapsed = (T - this._startTime) / this._duration;
    elapsed = (this._duration === 0 || elapsed > 1) ? 1 : elapsed;

    // calculate progress
    const progress = this._easing(elapsed);

    // render the update
    Object.keys(this.valuesEnd).forEach((tweenProp) => {
      KEC[tweenProp](this.element,
        this.valuesStart[tweenProp],
        this.valuesEnd[tweenProp],
        progress);
    });

    // fire the updateCallback
    if (this._onUpdate) {
      this._onUpdate.call(this);
    }

    if (elapsed === 1) {
      // fire the complete callback
      if (this._onComplete) {
        this._onComplete.call(this);
      }

      // now we're sure no animation is running
      this.playing = false;

      // stop ticking when finished
      this.close();

      // start animating chained tweens
      if (this._chain !== undefined && this._chain.length) {
        this._chain.map((tw) => tw.start());
      }

      return false;
    }

    return true;
  }
}

// Update Tween Interface
connect.tween = TweenBase;/**
 * The `KUTE.Tween()` constructor creates a new `Tween` object
 * for a single `HTMLElement` and returns it.
 *
 * This constructor adds additional functionality and is the default
 * Tween object constructor in KUTE.js.
 */
class Tween extends TweenBase {
  /**
   * @param {KUTE.tweenParams} args (*target*, *startValues*, *endValues*, *options*)
   * @returns {Tween} the resulting Tween object
   */
  constructor(...args) {
    super(...args); // this calls the constructor of TweenBase

    // reset interpolation values
    this.valuesStart = {};
    this.valuesEnd = {};

    // const startObject = args[1];
    // const endObject = args[2];
    const [startObject, endObject, options] = args.slice(1);

    // set valuesEnd
    prepareObject.call(this, endObject, 'end');

    // set valuesStart
    if (this._resetStart) {
      this.valuesStart = startObject;
    } else {
      prepareObject.call(this, startObject, 'start');
    }

    // ready for crossCheck
    if (!this._resetStart) {
      Object.keys(crossCheck).forEach((component) => {
        Object.keys(crossCheck[component]).forEach((checkProp) => {
          crossCheck[component][checkProp].call(this, checkProp);
        });
      });
    }

    // set paused state
    /** @type {boolean} */
    this.paused = false;
    /** @type {number?} */
    this._pauseTime = null;

    // additional properties and options
    /** @type {number?} */
    this._repeat = options.repeat || defaultOptions$1.repeat;
    /** @type {number?} */
    this._repeatDelay = options.repeatDelay || defaultOptions$1.repeatDelay;
    // we cache the number of repeats to be able to put it back after all cycles finish
    /** @type {number?} */
    this._repeatOption = this._repeat;

    // yoyo needs at least repeat: 1
    /** @type {KUTE.tweenProps} */
    this.valuesRepeat = {}; // valuesRepeat
    /** @type {boolean} */
    this._yoyo = options.yoyo || defaultOptions$1.yoyo;
    /** @type {boolean} */
    this._reversed = false;

    // don't load extra callbacks
    // this._onPause = options.onPause || defaultOptions.onPause
    // this._onResume = options.onResume || defaultOptions.onResume

    // chained Tweens
    // this._chain = options.chain || defaultOptions.chain;
    return this;
  }

  /**
   * Starts tweening, extended method
   * @param {number?} time the tween start time
   * @returns {Tween} this instance
   */
  start(time) {
    // on start we reprocess the valuesStart for TO() method
    if (this._resetStart) {
      this.valuesStart = this._resetStart;
      getStartValues.call(this);

      // this is where we do the valuesStart and valuesEnd check for fromTo() method
      Object.keys(crossCheck).forEach((component) => {
        Object.keys(crossCheck[component]).forEach((checkProp) => {
          crossCheck[component][checkProp].call(this, checkProp);
        });
      });
    }
    // still not paused
    this.paused = false;

    // set yoyo values
    if (this._yoyo) {
      Object.keys(this.valuesEnd).forEach((endProp) => {
        this.valuesRepeat[endProp] = this.valuesStart[endProp];
      });
    }

    super.start(time);

    return this;
  }

  /**
   * Stops tweening, extended method
   * @returns {Tween} this instance
   */
  stop() {
    super.stop();
    if (!this.paused && this.playing) {
      this.paused = false;
      this.stopChainedTweens();
    }
    return this;
  }

  /**
   * Trigger internal completion callbacks.
   */
  close() {
    super.close();

    if (this._repeatOption > 0) {
      this._repeat = this._repeatOption;
    }
    if (this._yoyo && this._reversed === true) {
      this.reverse();
      this._reversed = false;
    }

    return this;
  }

  /**
   * Resume tweening
   * @returns {Tween} this instance
   */
  resume() {
    if (this.paused && this.playing) {
      this.paused = false;
      if (this._onResume !== undefined) {
        this._onResume.call(this);
      }
      // re-queue execution context
      queueStart.call(this);
      // update time and let it roll
      this._startTime += KEC.Time() - this._pauseTime;
      add(this);
      // restart ticker if stopped
      if (!Tick) Ticker();
    }
    return this;
  }

  /**
   * Pause tweening
   * @returns {Tween} this instance
   */
  pause() {
    if (!this.paused && this.playing) {
      remove(this);
      this.paused = true;
      this._pauseTime = KEC.Time();
      if (this._onPause !== undefined) {
        this._onPause.call(this);
      }
    }
    return this;
  }

  /**
   * Reverses start values with end values
   */
  reverse() {
    Object.keys(this.valuesEnd).forEach((reverseProp) => {
      const tmp = this.valuesRepeat[reverseProp];
      this.valuesRepeat[reverseProp] = this.valuesEnd[reverseProp];
      this.valuesEnd[reverseProp] = tmp;
      this.valuesStart[reverseProp] = this.valuesRepeat[reverseProp];
    });
  }

  /**
   * Update the tween on each tick.
   * @param {number} time the tick time
   * @returns {boolean} this instance
   */
  update(time) {
    const T = time !== undefined ? time : KEC.Time();

    let elapsed;

    if (T < this._startTime && this.playing) { return true; }

    elapsed = (T - this._startTime) / this._duration;
    elapsed = (this._duration === 0 || elapsed > 1) ? 1 : elapsed;

    // calculate progress
    const progress = this._easing(elapsed);

    // render the update
    Object.keys(this.valuesEnd).forEach((tweenProp) => {
      KEC[tweenProp](this.element,
        this.valuesStart[tweenProp],
        this.valuesEnd[tweenProp],
        progress);
    });

    // fire the updateCallback
    if (this._onUpdate) {
      this._onUpdate.call(this);
    }

    if (elapsed === 1) {
      if (this._repeat > 0) {
        if (Number.isFinite(this._repeat)) this._repeat -= 1;

        // set the right time for delay
        this._startTime = T;
        if (Number.isFinite(this._repeat) && this._yoyo && !this._reversed) {
          this._startTime += this._repeatDelay;
        }

        if (this._yoyo) { // handle yoyo
          this._reversed = !this._reversed;
          this.reverse();
        }

        return true;
      }

      // fire the complete callback
      if (this._onComplete) {
        this._onComplete.call(this);
      }

      // now we're sure no animation is running
      this.playing = false;

      // stop ticking when finished
      this.close();

      // start animating chained tweens
      if (this._chain !== undefined && this._chain.length) {
        this._chain.forEach((tw) => tw.start());
      }

      return false;
    }
    return true;
  }
}

// Update Tween Interface Update
connect.tween = Tween;// to do
// * per property easing
// * per property duration
// * per property callback
// * per property delay/offset
// * new update method to work with the above
// * other cool ideas

/**
 * The `KUTE.TweenExtra()` constructor creates a new `Tween` object
 * for a single `HTMLElement` and returns it.
 *
 * This constructor is intended for experiments or testing of new features.
 */
class TweenExtra extends Tween {
  /**
   * @param {KUTE.tweenParams} args (*target*, *startValues*, *endValues*, *options*)
   * @returns {TweenExtra} the resulting Tween object
   */
  constructor(...args) {
    super(...args); // import constructor of TweenBase -> Tween

    return this;
  }

  // additional methods
  // set/override property
  // to(property, value) {
  // TO DO
  // this.valuesEnd[property] = value // well that's not all
  // }

  // fromTo(property, value) {
  // TO DO
  // this.valuesEnd[property] = value // well that's not all
  // }

  // getTotalDuration() {
  // to do
  // }

  /**
   * Method to add callbacks on the fly.
   * @param {string} name callback name
   * @param {Function} fn callback function
   * @returns {TweenExtra}
   */
  on(name, fn) {
    if (['start', 'stop', 'update', 'complete', 'pause', 'resume'].indexOf(name) > -1) {
      this[`_on${name.charAt(0).toUpperCase() + name.slice(1)}`] = fn;
    }
    return this;
  }

  /**
   * Method to set options on the fly.
   * * accepting [repeat,yoyo,delay,repeatDelay,easing]
   *
   * @param {string} option the tick time
   * @param {string | number | number[]} value the tick time
   * @returns {TweenExtra}
   */
  option(option, value) {
    this[`_${option}`] = value;
    return this;
  }
}

// Tween Interface
connect.tween = TweenExtra;/**
 * The static method creates a new `Tween` object for each `HTMLElement`
 * from and `Array`, `HTMLCollection` or `NodeList`.
 */
class TweenCollection {
  /**
   *
   * @param {Element[] | HTMLCollection | NodeList} els target elements
   * @param {KUTE.tweenProps} vS the start values
   * @param {KUTE.tweenProps} vE the end values
   * @param {KUTE.tweenOptions} Options tween options
   * @returns {TweenCollection} the Tween object collection
   */
  constructor(els, vS, vE, Options) {
    const TweenConstructor = connect.tween;
    /** @type {KUTE.twCollection[]} */
    this.tweens = [];

    const Ops = Options || {};
    /** @type {number?} */
    Ops.delay = Ops.delay || defaultOptions$1.delay;

    // set all options
    const options = [];

    Array.from(els).forEach((el, i) => {
      options[i] = Ops || {};
      options[i].delay = i > 0 ? Ops.delay + (Ops.offset || defaultOptions$1.offset) : Ops.delay;
      if (el instanceof Element) {
        this.tweens.push(new TweenConstructor(el, vS, vE, options[i]));
      } else {
        throw Error(`KUTE - ${el} is not instanceof Element`);
      }
    });

    /** @type {number?} */
    this.length = this.tweens.length;
    return this;
  }

  /**
   * Starts tweening, all targets
   * @param {number?} time the tween start time
   * @returns {TweenCollection} this instance
   */
  start(time) {
    const T = time === undefined ? KEC.Time() : time;
    this.tweens.map((tween) => tween.start(T));
    return this;
  }

  /**
   * Stops tweening, all targets and their chains
   * @returns {TweenCollection} this instance
   */
  stop() {
    this.tweens.map((tween) => tween.stop());
    return this;
  }

  /**
   * Pause tweening, all targets
   * @returns {TweenCollection} this instance
   */
  pause() {
    this.tweens.map((tween) => tween.pause());
    return this;
  }

  /**
   * Resume tweening, all targets
   * @returns {TweenCollection} this instance
   */
  resume() {
    this.tweens.map((tween) => tween.resume());
    return this;
  }

  /**
   * Schedule another tween or collection to start after
   * this one is complete.
   * @param {number?} args the tween start time
   * @returns {TweenCollection} this instance
   */
  chain(args) {
    const lastTween = this.tweens[this.length - 1];
    if (args instanceof TweenCollection) {
      lastTween.chain(args.tweens);
    } else if (args instanceof connect.tween) {
      lastTween.chain(args);
    } else {
      throw new TypeError('KUTE.js - invalid chain value');
    }
    return this;
  }

  /**
   * Check if any tween instance is playing
   * @param {number?} time the tween start time
   * @returns {TweenCollection} this instance
   */
  playing() {
    return this.tweens.some((tw) => tw.playing);
  }

  /**
   * Remove all tweens in the collection
   */
  removeTweens() {
    this.tweens = [];
  }

  /**
   * Returns the maximum animation duration
   * @returns {number} this instance
   */
  getMaxDuration() {
    const durations = [];
    this.tweens.forEach((tw) => {
      durations.push(tw._duration + tw._delay + tw._repeat * tw._repeatDelay);
    });
    return Math.max(durations);
  }
}/**
 * ProgressBar
 *
 * @class
 * A progress bar utility for KUTE.js that will connect
 * a target `<input type="slider">`. with a Tween instance
 * allowing it to control the progress of the Tween.
 */
class ProgressBar {
  /**
   * @constructor
   * @param {HTMLElement} el target or string selector
   * @param {KUTE.Tween} multi when true returns an array of elements
   */
  constructor(element, tween) {
    this.element = selector(element);
    this.element.tween = tween;
    this.element.tween.toolbar = this.element;
    this.element.toolbar = this;
    [this.element.output] = this.element.parentNode.getElementsByTagName('OUTPUT');

    // invalidate
    if (!(this.element instanceof HTMLInputElement)) throw TypeError('Target element is not [HTMLInputElement]');
    if (this.element.type !== 'range') throw TypeError('Target element is not a range input');
    if (!(tween instanceof connect.tween)) throw TypeError(`tween parameter is not [${connect.tween}]`);

    this.element.setAttribute('value', 0);
    this.element.setAttribute('min', 0);
    this.element.setAttribute('max', 1);
    this.element.setAttribute('step', 0.0001);

    this.element.tween._onUpdate = this.updateBar;

    this.element.addEventListener('mousedown', this.downAction, false);
  }

  updateBar() {
    const tick = 0.0001;
    const { output } = this.toolbar;

    // let progress = this.paused ? this.toolbar.value
    // : (KEC.Time() - this._startTime) / this._duration;
    // progress = progress > 1 - tick ? 1 : progress < 0.01 ? 0 : progress;

    let progress;
    if (this.paused) {
      progress = this.toolbar.value;
    } else {
      progress = (KEC.Time() - this._startTime) / this._duration;
    }

    // progress = progress > 1 - tick ? 1 : progress < 0.01 ? 0 : progress;
    if (progress > 1 - tick) progress = 1;
    if (progress < 0.01) progress = 0;

    const value = !this._reversed ? progress : 1 - progress;
    this.toolbar.value = value;
    // eslint-disable-next-line no-bitwise
    if (output) output.value = `${(value * 10000 >> 0) / 100}%`;
  }

  toggleEvents(action) {
    // add passive handler ?
    this.element[`${action}EventListener`]('mousemove', this.moveAction, false);
    this.element[`${action}EventListener`]('mouseup', this.upAction, false);
  }

  updateTween() {
    // make sure we never complete the tween
    const progress = (!this.tween._reversed ? this.value : 1 - this.value)
      * this.tween._duration - 0.0001;

    this.tween._startTime = 0;
    this.tween.update(progress);
  }

  moveAction() {
    this.toolbar.updateTween.call(this);
  }

  downAction() {
    if (!this.tween.playing) {
      this.tween.start();
    }

    if (!this.tween.paused) {
      this.tween.pause();
      this.toolbar.toggleEvents('add');

      KEC.Tick = cancelAnimationFrame(KEC.Ticker);
    }
  }

  upAction() {
    if (this.tween.paused) {
      if (this.tween.paused) this.tween.resume();

      this.tween._startTime = KEC.Time()
        - (!this.tween._reversed ? this.value : 1 - this.value) * this.tween._duration;

      this.toolbar.toggleEvents('remove');
      KEC.Tick = requestAnimationFrame(KEC.Ticker);
    }
  }
}const { tween: TweenConstructor$1 } = connect;

/**
 * The `KUTE.to()` static method returns a new Tween object
 * for a single `HTMLElement` at its current state.
 *
 * @param {Element} element target element
 * @param {KUTE.tweenProps} endObject
 * @param {KUTE.tweenOptions} optionsObj tween options
 * @returns {KUTE.Tween} the resulting Tween object
 */
function to(element, endObject, optionsObj) {
  const options = optionsObj || {};
  options.resetStart = endObject;
  return new TweenConstructor$1(selector(element), endObject, endObject, options);
}const { tween: TweenConstructor } = connect;

/**
 * The `KUTE.fromTo()` static method returns a new Tween object
 * for a single `HTMLElement` at a given state.
 *
 * @param {Element} element target element
 * @param {KUTE.tweenProps} startObject
 * @param {KUTE.tweenProps} endObject
 * @param {KUTE.tweenOptions} optionsObj tween options
 * @returns {KUTE.Tween} the resulting Tween object
 */
function fromTo(element, startObject, endObject, optionsObj) {
  const options = optionsObj || {};
  return new TweenConstructor(selector(element), startObject, endObject, options);
}/**
 * The `KUTE.allTo()` static method creates a new Tween object
 * for multiple `HTMLElement`s, `HTMLCollection` or `NodeListat`
 * at their current state.
 *
 * @param {Element[] | HTMLCollection | NodeList} elements target elements
 * @param {KUTE.tweenProps} endObject
 * @param {KUTE.tweenProps} optionsObj progress
 * @returns {TweenCollection} the Tween object collection
 */
function allTo(elements, endObject, optionsObj) {
  const options = optionsObj || {};
  options.resetStart = endObject;
  return new TweenCollection(selector(elements, true), endObject, endObject, options);
}/**
 * The `KUTE.allFromTo()` static method creates a new Tween object
 * for multiple `HTMLElement`s, `HTMLCollection` or `NodeListat`
 * at a given state.
 *
 * @param {Element[] | HTMLCollection | NodeList} elements target elements
 * @param {KUTE.tweenProps} startObject
 * @param {KUTE.tweenProps} endObject
 * @param {KUTE.tweenOptions} optionsObj tween options
 * @returns {TweenCollection} the Tween object collection
 */
function allFromTo(elements, startObject, endObject, optionsObj) {
  const options = optionsObj || {};
  return new TweenCollection(selector(elements, true), startObject, endObject, options);
}/**
 * Animation Class
 *
 * Registers components by populating KUTE.js objects and makes sure
 * no duplicate component / property is allowed.
 */
class Animation {
  /**
   * @constructor
   * @param {KUTE.fullComponent} Component
   */
  constructor(Component) {
    try {
      if (Component.component in supportedProperties) {
        throw Error(`KUTE - ${Component.component} already registered`);
      } else if (Component.property in defaultValues) {
        throw Error(`KUTE - ${Component.property} already registered`);
      }
    } catch (e) {
      throw Error(e);
    }

    const propertyInfo = this;
    const ComponentName = Component.component;
    // const Objects = { defaultValues, defaultOptions, Interpolate, linkProperty, Util }
    const Functions = {
      prepareProperty, prepareStart, onStart, onComplete, crossCheck,
    };
    const Category = Component.category;
    const Property = Component.property;
    const Length = (Component.properties && Component.properties.length)
      || (Component.subProperties && Component.subProperties.length);

    // single property
    // {property,defaultvalue,defaultOptions,Interpolate,functions}

    // category colors, boxModel, borderRadius
    // {category,properties,defaultvalues,defaultOptions,Interpolate,functions}

    // property with multiple sub properties. Eg transform, filter
    // {property,subProperties,defaultvalues,defaultOptions,Interpolate,functions}

    // property with multiple sub properties. Eg htmlAttributes
    // {category,subProperties,defaultvalues,defaultOptions,Interpolate,functions}

    // set supported category/property
    supportedProperties[ComponentName] = Component.properties
      || Component.subProperties || Component.property;

    // set defaultValues
    if ('defaultValue' in Component) { // value 0 will invalidate
      defaultValues[Property] = Component.defaultValue;

      // minimal info
      propertyInfo.supports = `${Property} property`;
    } else if (Component.defaultValues) {
      Object.keys(Component.defaultValues).forEach((dv) => {
        defaultValues[dv] = Component.defaultValues[dv];
      });

      // minimal info
      propertyInfo.supports = `${Length || Property} ${Property || Category} properties`;
    }

    // set additional options
    if (Component.defaultOptions) {
      // Object.keys(Component.defaultOptions).forEach((op) => {
      //   defaultOptions[op] = Component.defaultOptions[op];
      // });
      Object.assign(defaultOptions$1, Component.defaultOptions);
    }

    // set functions
    if (Component.functions) {
      Object.keys(Functions).forEach((fn) => {
        if (fn in Component.functions) {
          if (typeof (Component.functions[fn]) === 'function') {
            // if (!Functions[fn][ Category||Property ]) {
            //   Functions[fn][ Category||Property ] = Component.functions[fn];
            // }
            if (!Functions[fn][ComponentName]) Functions[fn][ComponentName] = {};
            if (!Functions[fn][ComponentName][Category || Property]) {
              Functions[fn][ComponentName][Category || Property] = Component.functions[fn];
            }
          } else {
            Object.keys(Component.functions[fn]).forEach((ofn) => {
              // !Functions[fn][ofn] && (Functions[fn][ofn] = Component.functions[fn][ofn])
              if (!Functions[fn][ComponentName]) Functions[fn][ComponentName] = {};
              if (!Functions[fn][ComponentName][ofn]) {
                Functions[fn][ComponentName][ofn] = Component.functions[fn][ofn];
              }
            });
          }
        }
      });
    }

    // set component interpolation functions
    if (Component.Interpolate) {
      Object.keys(Component.Interpolate).forEach((fni) => {
        const compIntObj = Component.Interpolate[fni];
        if (typeof (compIntObj) === 'function' && !interpolate[fni]) {
          interpolate[fni] = compIntObj;
        } else {
          Object.keys(compIntObj).forEach((sfn) => {
            if (typeof (compIntObj[sfn]) === 'function' && !interpolate[fni]) {
              interpolate[fni] = compIntObj[sfn];
            }
          });
        }
      });

      linkProperty[ComponentName] = Component.Interpolate;
    }

    // set component util
    if (Component.Util) {
      Object.keys(Component.Util).forEach((fnu) => {
        if (!Util[fnu]) Util[fnu] = Component.Util[fnu];
      });
    }

    return propertyInfo;
  }
}/**
 * Animation Development Class
 *
 * Registers components by populating KUTE.js objects and makes sure
 * no duplicate component / property is allowed.
 *
 * In addition to the default class, this one provides more component
 * information to help you with custom component development.
 */
class AnimationDevelopment extends Animation {
  /**
   *
   * @param  {KUTE.fullComponent} args
   */
  constructor(Component) {
    super(Component);

    const propertyInfo = this;
    // const Objects = { defaultValues, defaultOptions, Interpolate, linkProperty, Util }
    const Functions = {
      prepareProperty, prepareStart, onStart, onComplete, crossCheck,
    };
    const Category = Component.category;
    const Property = Component.property;
    const Length = (Component.properties && Component.properties.length)
      || (Component.subProperties && Component.subProperties.length);

    // set defaultValues
    if ('defaultValue' in Component) { // value 0 will invalidate
      propertyInfo.supports = `${Property} property`;
      propertyInfo.defaultValue = `${(`${Component.defaultValue}`).length ? 'YES' : 'not set or incorrect'}`;
    } else if (Component.defaultValues) {
      propertyInfo.supports = `${Length || Property} ${Property || Category} properties`;
      propertyInfo.defaultValues = Object.keys(Component.defaultValues).length === Length ? 'YES' : 'Not set or incomplete';
    }

    // set additional options
    if (Component.defaultOptions) {
      propertyInfo.extends = [];

      Object.keys(Component.defaultOptions).forEach((op) => {
        propertyInfo.extends.push(op);
      });

      if (propertyInfo.extends.length) {
        propertyInfo.extends = `with <${propertyInfo.extends.join(', ')}> new option(s)`;
      } else {
        delete propertyInfo.extends;
      }
    }

    // set functions
    if (Component.functions) {
      propertyInfo.interface = [];
      propertyInfo.render = [];
      propertyInfo.warning = [];

      Object.keys(Functions).forEach((fnf) => {
        if (fnf in Component.functions) {
          if (fnf === 'prepareProperty') propertyInfo.interface.push('fromTo()');
          if (fnf === 'prepareStart') propertyInfo.interface.push('to()');
          if (fnf === 'onStart') propertyInfo.render = 'can render update';
        } else {
          if (fnf === 'prepareProperty') propertyInfo.warning.push('fromTo()');
          if (fnf === 'prepareStart') propertyInfo.warning.push('to()');
          if (fnf === 'onStart') propertyInfo.render = 'no function to render update';
        }
      });

      if (propertyInfo.interface.length) {
        propertyInfo.interface = `${Category || Property} can use [${propertyInfo.interface.join(', ')}] method(s)`;
      } else {
        delete propertyInfo.uses;
      }

      if (propertyInfo.warning.length) {
        propertyInfo.warning = `${Category || Property} can't use [${propertyInfo.warning.join(', ')}] method(s) because values aren't processed`;
      } else {
        delete propertyInfo.warning;
      }
    }

    // register Interpolation functions
    if (Component.Interpolate) {
      propertyInfo.uses = [];
      propertyInfo.adds = [];

      Object.keys(Component.Interpolate).forEach((fni) => {
        const compIntObj = Component.Interpolate[fni];
        // register new Interpolation functions
        if (typeof (compIntObj) === 'function') {
          if (!interpolate[fni]) {
            propertyInfo.adds.push(`${fni}`);
          }
          propertyInfo.uses.push(`${fni}`);
        } else {
          Object.keys(compIntObj).forEach((sfn) => {
            if (typeof (compIntObj[sfn]) === 'function' && !interpolate[fni]) {
              propertyInfo.adds.push(`${sfn}`);
            }
            propertyInfo.uses.push(`${sfn}`);
          });
        }
      });

      if (propertyInfo.uses.length) {
        propertyInfo.uses = `[${propertyInfo.uses.join(', ')}] interpolation function(s)`;
      } else {
        delete propertyInfo.uses;
      }

      if (propertyInfo.adds.length) {
        propertyInfo.adds = `new [${propertyInfo.adds.join(', ')}] interpolation function(s)`;
      } else {
        delete propertyInfo.adds;
      }
    } else {
      propertyInfo.critical = `For ${Property || Category} no interpolation function[s] is set`;
    }

    // set component util
    if (Component.Util) {
      propertyInfo.hasUtil = Object.keys(Component.Util).join(',');
    }

    return propertyInfo;
  }
}/**
 * Numbers Interpolation Function.
 *
 * @param {number} a start value
 * @param {number} b end value
 * @param {number} v progress
 * @returns {number} the interpolated number
 */
function numbers(a, b, v) {
  const A = +a;
  const B = b - a;
  // a = +a; b -= a;
  return A + B * v;
}/**
 * trueDimension
 *
 * Returns the string value of a specific CSS property converted into a nice
 * { v = value, u = unit } object.
 *
 * @param {string} dimValue the property string value
 * @param {boolean | number} isAngle sets the utility to investigate angles
 * @returns {{v: number, u: string}} the true {value, unit} tuple
 */
const trueDimension = (dimValue, isAngle) => {
  const intValue = parseInt(dimValue, 10) || 0;
  const mUnits = ['px', '%', 'deg', 'rad', 'em', 'rem', 'vh', 'vw'];
  let theUnit;

  for (let mIndex = 0; mIndex < mUnits.length; mIndex += 1) {
    if (typeof dimValue === 'string' && dimValue.includes(mUnits[mIndex])) {
      theUnit = mUnits[mIndex]; break;
    }
  }
  if (theUnit === undefined) {
    theUnit = isAngle ? 'deg' : 'px';
  }

  return { v: intValue, u: theUnit };
};// Component Functions
/**
 * Sets the property update function.
 * @param {string} prop the property name
 */
function onStartBgPos(prop) {
  if (this.valuesEnd[prop] && !KEC[prop]) {
    KEC[prop] = (elem, a, b, v) => {
      /* eslint-disable -- no-bitwise & no-param-reassign impossible to satisfy */
      elem.style[prop] = `${(numbers(a[0], b[0], v) * 100 >> 0) / 100}%  ${((numbers(a[1], b[1], v) * 100 >> 0) / 100)}%`;
      /* eslint-enable -- no-bitwise & no-param-reassign impossible to satisfy */
    };
  }
}// Component Functions

/**
 * Returns the property computed style.
 * @param {string} prop the property
 * @returns {string} the property computed style
 */
function getBgPos(prop/* , value */) {
  return getStyleForProperty(this.element, prop) || defaultValues[prop];
}

/**
 * Returns the property tween object.
 * @param {string} _ the property name
 * @param {string} value the property value
 * @returns {number[]} the property tween object
 */
function prepareBgPos(/* prop, */_, value) {
  if (value instanceof Array) {
    const x = trueDimension(value[0]).v;
    const y = trueDimension(value[1]).v;
    return [!Number.isNaN(x * 1) ? x : 50, !Number.isNaN(y * 1) ? y : 50];
  }

  let posxy = value.replace(/top|left/g, 0)
    .replace(/right|bottom/g, 100)
    .replace(/center|middle/g, 50);

  posxy = posxy.split(/(,|\s)/g);
  posxy = posxy.length === 2 ? posxy : [posxy[0], 50];
  return [trueDimension(posxy[0]).v, trueDimension(posxy[1]).v];
}

// All Component Functions
const bgPositionFunctions = {
  prepareStart: getBgPos,
  prepareProperty: prepareBgPos,
  onStart: onStartBgPos,
};

// Component Full Object
const BackgroundPosition = {
  component: 'backgroundPositionProp',
  property: 'backgroundPosition',
  defaultValue: [50, 50],
  Interpolate: { numbers },
  functions: bgPositionFunctions,
  Util: { trueDimension },
};/**
 * Units Interpolation Function.
 *
 * @param {number} a start value
 * @param {number} b end value
 * @param {string} u unit
 * @param {number} v progress
 * @returns {string} the interpolated value + unit string
 */
function units(a, b, u, v) { // number1, number2, unit, progress
  const A = +a;
  const B = b - a;
  // a = +a; b -= a;
  return (A + B * v) + u;
}/* borderRadius = {
  category: 'borderRadius',
  properties : [..],
  defaultValues: {..},
  interpolation: {units}
} */

// Component Properties
const radiusProps$1 = [
  'borderRadius',
  'borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomLeftRadius', 'borderBottomRightRadius',
];

// Component Functions
/**
 * Sets the property update function.
 * @param {string} tweenProp the property name
 */
function radiusOnStartFn(tweenProp) {
  if (tweenProp in this.valuesEnd && !KEC[tweenProp]) {
    KEC[tweenProp] = (elem, a, b, v) => {
      // eslint-disable-next-line no-param-reassign -- impossible to satisfy
      elem.style[tweenProp] = units(a.v, b.v, b.u, v);
    };
  }
}
const radiusOnStart$1 = {};
radiusProps$1.forEach((tweenProp) => {
  radiusOnStart$1[tweenProp] = radiusOnStartFn;
});// Component Properties
const radiusProps = [
  'borderRadius',
  'borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomLeftRadius', 'borderBottomRightRadius'];

const radiusValues = {};
radiusProps.forEach((x) => { radiusValues[x] = 0; });

// Component Functions
const radiusOnStart = {};
radiusProps.forEach((tweenProp) => {
  radiusOnStart[tweenProp] = radiusOnStartFn;
});// Component Functions
/**
 * Sets the update function for the property.
 * @param {string} tweenProp the property name
 */
function boxModelOnStart(tweenProp) {
  if (tweenProp in this.valuesEnd && !KEC[tweenProp]) {
    KEC[tweenProp] = (elem, a, b, v) => {
      /* eslint-disable no-param-reassign -- impossible to satisfy */
      /* eslint-disable no-bitwise -- impossible to satisfy */
      elem.style[tweenProp] = `${v > 0.99 || v < 0.01
        ? ((numbers(a, b, v) * 10) >> 0) / 10
        : (numbers(a, b, v)) >> 0}px`;
      /* eslint-enable no-bitwise */
      /* eslint-enable no-param-reassign */
    };
  }
}

// Component Base Props
const baseBoxProps = ['top', 'left', 'width', 'height'];
const baseBoxOnStart = {};
baseBoxProps.forEach((x) => { baseBoxOnStart[x] = boxModelOnStart; });// Component Properties
const boxModelProperties = ['top', 'left', 'width', 'height', 'right', 'bottom', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'borderWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'outlineWidth'];

const boxModelValues = {};
boxModelProperties.forEach((x) => { boxModelValues[x] = 0; });
const boxPropsOnStart = {};
boxModelProperties.forEach((x) => { boxPropsOnStart[x] = boxModelOnStart; });/**
 * hexToRGB
 *
 * Converts a #HEX color format into RGB
 * and returns a color object {r,g,b}.
 *
 * @param {string} hex the degree angle
 * @returns {KUTE.colorObject | null} the radian angle
 */
const hexToRGB = (hex) => {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const hexShorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const HEX = hex.replace(hexShorthand, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(HEX);

  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
};/**
 * trueColor
 *
 * Transform any color to rgba()/rgb() and return a nice RGB(a) object.
 *
 * @param {string} colorString the color input
 * @returns {KUTE.colorObject} the {r,g,b,a} color object
 */
const trueColor = (colorString) => {
  let result;
  if (/rgb|rgba/.test(colorString)) { // first check if it's a rgb string
    const vrgb = colorString.replace(/\s|\)/, '').split('(')[1].split(',');
    const colorAlpha = vrgb[3] ? vrgb[3] : null;
    if (!colorAlpha) {
      result = { r: parseInt(vrgb[0], 10), g: parseInt(vrgb[1], 10), b: parseInt(vrgb[2], 10) };
    }
    result = {
      r: parseInt(vrgb[0], 10),
      g: parseInt(vrgb[1], 10),
      b: parseInt(vrgb[2], 10),
      a: parseFloat(colorAlpha),
    };
  } if (/^#/.test(colorString)) {
    const fromHex = hexToRGB(colorString);
    result = { r: fromHex.r, g: fromHex.g, b: fromHex.b };
  } if (/transparent|none|initial|inherit/.test(colorString)) {
    result = {
      r: 0, g: 0, b: 0, a: 0,
    };
  }
  // maybe we can check for web safe colors
  // only works in a browser
  if (!/^#|^rgb/.test(colorString)) {
    const siteHead = document.getElementsByTagName('head')[0];
    siteHead.style.color = colorString;
    let webColor = getComputedStyle(siteHead, null).color;
    webColor = /rgb/.test(webColor) ? webColor.replace(/[^\d,]/g, '').split(',') : [0, 0, 0];
    siteHead.style.color = '';
    result = {
      r: parseInt(webColor[0], 10),
      g: parseInt(webColor[1], 10),
      b: parseInt(webColor[2], 10),
    };
  }
  return result;
};/**
 * Color Interpolation Function.
 *
 * @param {KUTE.colorObject} a start color
 * @param {KUTE.colorObject} b end color
 * @param {number} v progress
 * @returns {string} the resulting color
 */
function colors(a, b, v) {
  const _c = {};
  const ep = ')';
  const cm = ',';
  const rgb = 'rgb(';
  const rgba = 'rgba(';

  Object.keys(b).forEach((c) => {
    if (c !== 'a') {
      _c[c] = numbers(a[c], b[c], v) >> 0 || 0; // eslint-disable-line no-bitwise
    } else if (a[c] && b[c]) {
      _c[c] = (numbers(a[c], b[c], v) * 100 >> 0) / 100; // eslint-disable-line no-bitwise
    }
  });

  return !_c.a
    ? rgb + _c.r + cm + _c.g + cm + _c.b + ep
    : rgba + _c.r + cm + _c.g + cm + _c.b + cm + _c.a + ep;
}// Component Interpolation
// rgba1, rgba2, progress

// Component Properties
// supported formats
// 'hex', 'rgb', 'rgba' '#fff' 'rgb(0,0,0)' / 'rgba(0,0,0,0)' 'red' (IE9+)
const supportedColors$1 = [
  'color', 'backgroundColor', 'outlineColor',
  'borderColor',
  'borderTopColor', 'borderRightColor',
  'borderBottomColor', 'borderLeftColor',
];

// Component Functions
/**
 * Sets the property update function.
 * @param {string} tweenProp the property name
 */
function onStartColors(tweenProp) {
  if (this.valuesEnd[tweenProp] && !KEC[tweenProp]) {
    KEC[tweenProp] = (elem, a, b, v) => {
      // eslint-disable-next-line no-param-reassign
      elem.style[tweenProp] = colors(a, b, v);
    };
  }
}

const colorsOnStart$1 = {};
supportedColors$1.forEach((x) => { colorsOnStart$1[x] = onStartColors; });// Component Properties
// supported formats
// 'hex', 'rgb', 'rgba' '#fff' 'rgb(0,0,0)' / 'rgba(0,0,0,0)' 'red' (IE9+)
const supportedColors = [
  'color', 'backgroundColor', 'outlineColor',
  'borderColor', 'borderTopColor', 'borderRightColor',
  'borderBottomColor', 'borderLeftColor',
];

const defaultColors = {};
supportedColors.forEach((tweenProp) => {
  defaultColors[tweenProp] = '#000';
});

// Component Functions
const colorsOnStart = {};
supportedColors.forEach((x) => {
  colorsOnStart[x] = onStartColors;
});// Component Special
const attributes = {};

const onStartAttr = {
  /**
   * onStartAttr.attr
   *
   * Sets the sub-property update function.
   * @param {string} tweenProp the property name
   */
  attr(tweenProp) {
    if (!KEC[tweenProp] && this.valuesEnd[tweenProp]) {
      KEC[tweenProp] = (elem, vS, vE, v) => {
        Object.keys(vE).forEach((oneAttr) => {
          KEC.attributes[oneAttr](elem, oneAttr, vS[oneAttr], vE[oneAttr], v);
        });
      };
    }
  },
  /**
   * onStartAttr.attributes
   *
   * Sets the update function for the property.
   * @param {string} tweenProp the property name
   */
  attributes(tweenProp) {
    if (!KEC[tweenProp] && this.valuesEnd.attr) {
      KEC[tweenProp] = attributes;
    }
  },
};// Component Name
const ComponentName = 'htmlAttributes';

// Component Properties
const svgColors = ['fill', 'stroke', 'stop-color'];

// Component Util
/**
 * Returns non-camelcase property name.
 * @param {string} a the camelcase property name
 * @returns {string} the non-camelcase property name
 */
function replaceUppercase(a) { return a.replace(/[A-Z]/g, '-$&').toLowerCase(); }

// Component Functions
/**
 * Returns the current attribute value.
 * @param {string} _ the property name
 * @param {string} value the property value
 * @returns {{[x:string]: string}} attribute value
 */
function getAttr(/* tweenProp, */_, value) {
  const attrStartValues = {};
  Object.keys(value).forEach((attr) => {
    // get the value for 'fill-opacity' not fillOpacity
    // also 'width' not the internal 'width_px'
    const attribute = replaceUppercase(attr).replace(/_+[a-z]+/, '');
    const currentValue = this.element.getAttribute(attribute);
    attrStartValues[attribute] = svgColors.includes(attribute)
      ? (currentValue || 'rgba(0,0,0,0)')
      : (currentValue || (/opacity/i.test(attr) ? 1 : 0));
  });

  return attrStartValues;
}

/**
 * Returns the property tween object.
 * @param {string} tweenProp the property name
 * @param {string} attrObj the property value
 * @returns {number} the property tween object
 */
function prepareAttr(tweenProp, attrObj) { // attr (string),attrObj (object)
  const attributesObject = {};

  Object.keys(attrObj).forEach((p) => {
    const prop = replaceUppercase(p);
    const regex = /(%|[a-z]+)$/;
    const currentValue = this.element.getAttribute(prop.replace(/_+[a-z]+/, ''));

    if (!svgColors.includes(prop)) {
      // attributes set with unit suffixes
      if (currentValue !== null && regex.test(currentValue)) {
        const unit = trueDimension(currentValue).u || trueDimension(attrObj[p]).u;
        const suffix = /%/.test(unit) ? '_percent' : `_${unit}`;

        // most "unknown" attributes cannot register into onStart, so we manually add them
        onStart[ComponentName][prop + suffix] = (tp) => {
          if (this.valuesEnd[tweenProp] && this.valuesEnd[tweenProp][tp] && !(tp in attributes)) {
            attributes[tp] = (elem, oneAttr, a, b, v) => {
              const _p = oneAttr.replace(suffix, '');
              /* eslint no-bitwise: ["error", { "allow": [">>"] }] */
              elem.setAttribute(_p, ((numbers(a.v, b.v, v) * 1000 >> 0) / 1000) + b.u);
            };
          }
        };
        attributesObject[prop + suffix] = trueDimension(attrObj[p]);
      } else if (!regex.test(attrObj[p]) || currentValue === null
        || (currentValue !== null && !regex.test(currentValue))) {
        // most "unknown" attributes cannot register into onStart, so we manually add them
        onStart[ComponentName][prop] = (tp) => {
          if (this.valuesEnd[tweenProp] && this.valuesEnd[tweenProp][tp] && !(tp in attributes)) {
            attributes[tp] = (elem, oneAttr, a, b, v) => {
              elem.setAttribute(oneAttr, (numbers(a, b, v) * 1000 >> 0) / 1000);
            };
          }
        };
        attributesObject[prop] = parseFloat(attrObj[p]);
      }
    } else { // colors
      // most "unknown" attributes cannot register into onStart, so we manually add them
      onStart[ComponentName][prop] = (tp) => {
        if (this.valuesEnd[tweenProp] && this.valuesEnd[tweenProp][tp] && !(tp in attributes)) {
          attributes[tp] = (elem, oneAttr, a, b, v) => {
            elem.setAttribute(oneAttr, colors(a, b, v));
          };
        }
      };
      attributesObject[prop] = trueColor(attrObj[p]) || defaultValues.htmlAttributes[p];
    }
  });

  return attributesObject;
}

// All Component Functions
const attrFunctions = {
  prepareStart: getAttr,
  prepareProperty: prepareAttr,
  onStart: onStartAttr,
};

// Component Full
const htmlAttributes = {
  component: ComponentName,
  property: 'attr',
  // the Animation class will need some values to validate this Object attribute
  subProperties: ['fill', 'stroke', 'stop-color', 'fill-opacity', 'stroke-opacity'],
  defaultValue: {
    fill: 'rgb(0,0,0)',
    stroke: 'rgb(0,0,0)',
    'stop-color': 'rgb(0,0,0)',
    opacity: 1,
    'stroke-opacity': 1,
    'fill-opacity': 1, // same here
  },
  Interpolate: { numbers, colors },
  functions: attrFunctions,
  // export to global for faster execution
  Util: { replaceUppercase, trueColor, trueDimension },
};/**
 * Segment params length
 * @type {Record<string, number>}
 */
const paramsCount = {
  a: 7, c: 6, h: 1, l: 2, m: 2, r: 4, q: 4, s: 4, t: 2, v: 1, z: 0,
};/**
 * Breaks the parsing of a pathString once a segment is finalized.
 *
 * @param {SVGPathCommander.PathParser} path the `PathParser` instance
 */
function finalizeSegment(path) {
  let pathCommand = path.pathValue[path.segmentStart];
  let LK = pathCommand.toLowerCase();
  let { data } = path;

  // Process duplicated commands (without comand name)
  if (LK === 'm' && data.length > 2) {
    // @ts-ignore
    path.segments.push([pathCommand, data[0], data[1]]);
    data = data.slice(2);
    LK = 'l';
    pathCommand = pathCommand === 'm' ? 'l' : 'L';
  }

  // @ts-ignore
  while (data.length >= paramsCount[LK]) {
    // path.segments.push([pathCommand].concat(data.splice(0, paramsCount[LK])));
    // @ts-ignore
    path.segments.push([pathCommand, ...data.splice(0, paramsCount[LK])]);
    // @ts-ignore
    if (!paramsCount[LK]) {
      break;
    }
  }
}const invalidPathValue = 'Invalid path value';/**
 * Validates an A (arc-to) specific path command value.
 * Usually a `large-arc-flag` or `sweep-flag`.
 *
 * @param {SVGPathCommander.PathParser} path the `PathParser` instance
 */
function scanFlag(path) {
  const { index } = path;
  const ch = path.pathValue.charCodeAt(index);

  if (ch === 0x30/* 0 */) {
    path.param = 0;
    path.index += 1;
    return;
  }

  if (ch === 0x31/* 1 */) {
    path.param = 1;
    path.index += 1;
    return;
  }

  path.err = `${invalidPathValue}: invalid Arc flag "${ch}", expecting 0 or 1 at index ${index}`;
}/**
 * Checks if a character is a digit.
 *
 * @param {number} code the character to check
 * @returns {boolean} check result
 */
function isDigit(code) {
  return (code >= 48 && code <= 57); // 0..9
}/**
 * Validates every character of the path string,
 * every path command, negative numbers or floating point numbers.
 *
 * @param {SVGPathCommander.PathParser} path the `PathParser` instance
 */
function scanParam(path) {
  const { max, pathValue, index: start } = path;
  let index = start;
  let zeroFirst = false;
  let hasCeiling = false;
  let hasDecimal = false;
  let hasDot = false;
  let ch;

  if (index >= max) {
    // path.err = 'SvgPath: missed param (at pos ' + index + ')';
    path.err = `${invalidPathValue} at ${index}: missing param ${pathValue[index]}`;
    return;
  }
  ch = pathValue.charCodeAt(index);

  if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
    index += 1;
    ch = (index < max) ? pathValue.charCodeAt(index) : 0;
  }

  // This logic is shamelessly borrowed from Esprima
  // https://github.com/ariya/esprimas
  if (!isDigit(ch) && ch !== 0x2E/* . */) {
    // path.err = 'SvgPath: param should start with 0..9 or `.` (at pos ' + index + ')';
    path.err = `${invalidPathValue} at index ${index}: ${pathValue[index]} is not a number`;
    return;
  }

  if (ch !== 0x2E/* . */) {
    zeroFirst = (ch === 0x30/* 0 */);
    index += 1;

    ch = (index < max) ? pathValue.charCodeAt(index) : 0;

    if (zeroFirst && index < max) {
      // decimal number starts with '0' such as '09' is illegal.
      if (ch && isDigit(ch)) {
        // path.err = 'SvgPath: numbers started with `0` such as `09`
        // are illegal (at pos ' + start + ')';
        path.err = `${invalidPathValue} at index ${start}: ${pathValue[start]} illegal number`;
        return;
      }
    }

    while (index < max && isDigit(pathValue.charCodeAt(index))) {
      index += 1;
      hasCeiling = true;
    }
    ch = (index < max) ? pathValue.charCodeAt(index) : 0;
  }

  if (ch === 0x2E/* . */) {
    hasDot = true;
    index += 1;
    while (isDigit(pathValue.charCodeAt(index))) {
      index += 1;
      hasDecimal = true;
    }
    ch = (index < max) ? pathValue.charCodeAt(index) : 0;
  }

  if (ch === 0x65/* e */ || ch === 0x45/* E */) {
    if (hasDot && !hasCeiling && !hasDecimal) {
      path.err = `${invalidPathValue} at index ${index}: ${pathValue[index]} invalid float exponent`;
      return;
    }

    index += 1;

    ch = (index < max) ? pathValue.charCodeAt(index) : 0;
    if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
      index += 1;
    }
    if (index < max && isDigit(pathValue.charCodeAt(index))) {
      while (index < max && isDigit(pathValue.charCodeAt(index))) {
        index += 1;
      }
    } else {
      // path.err = 'SvgPath: invalid float exponent (at pos ' + index + ')';
      path.err = `${invalidPathValue} at index ${index}: ${pathValue[index]} invalid float exponent`;
      return;
    }
  }

  path.index = index;
  path.param = +path.pathValue.slice(start, index);
}/**
 * Checks if the character is a space.
 *
 * @param {number} ch the character to check
 * @returns {boolean} check result
 */
function isSpace(ch) {
  const specialSpaces = [
    0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
    0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF];
  return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029) // Line terminators
    // White spaces
    || (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0)
    || (ch >= 0x1680 && specialSpaces.indexOf(ch) >= 0);
}/**
 * Points the parser to the next character in the
 * path string every time it encounters any kind of
 * space character.
 *
 * @param {SVGPathCommander.PathParser} path the `PathParser` instance
 */
function skipSpaces(path) {
  const { pathValue, max } = path;
  while (path.index < max && isSpace(pathValue.charCodeAt(path.index))) {
    path.index += 1;
  }
}/**
 * Checks if the character is a path command.
 *
 * @param {any} code the character to check
 * @returns {boolean} check result
 */
function isPathCommand(code) {
  // eslint-disable-next-line no-bitwise -- Impossible to satisfy
  switch (code | 0x20) {
    case 0x6D/* m */:
    case 0x7A/* z */:
    case 0x6C/* l */:
    case 0x68/* h */:
    case 0x76/* v */:
    case 0x63/* c */:
    case 0x73/* s */:
    case 0x71/* q */:
    case 0x74/* t */:
    case 0x61/* a */:
    // case 0x72/* r */:
      return true;
    default:
      return false;
  }
}/**
 * Checks if the character is or belongs to a number.
 * [0-9]|+|-|.
 *
 * @param {number} code the character to check
 * @returns {boolean} check result
 */
function isDigitStart(code) {
  return (code >= 48 && code <= 57) /* 0..9 */
    || code === 0x2B /* + */
    || code === 0x2D /* - */
    || code === 0x2E; /* . */
}/**
 * Checks if the character is an A (arc-to) path command.
 *
 * @param {number} code the character to check
 * @returns {boolean} check result
 */
function isArcCommand(code) {
  // eslint-disable-next-line no-bitwise -- Impossible to satisfy
  return (code | 0x20) === 0x61;
}/**
 * Scans every character in the path string to determine
 * where a segment starts and where it ends.
 *
 * @param {SVGPathCommander.PathParser} path the `PathParser` instance
 */
function scanSegment(path) {
  const { max, pathValue, index } = path;
  const cmdCode = pathValue.charCodeAt(index);
  const reqParams = paramsCount[pathValue[index].toLowerCase()];

  path.segmentStart = index;

  if (!isPathCommand(cmdCode)) {
    path.err = `${invalidPathValue}: ${pathValue[index]} not a path command`;
    return;
  }

  path.index += 1;
  skipSpaces(path);

  path.data = [];

  if (!reqParams) {
    // Z
    finalizeSegment(path);
    return;
  }

  for (;;) {
    for (let i = reqParams; i > 0; i -= 1) {
      if (isArcCommand(cmdCode) && (i === 3 || i === 4)) scanFlag(path);
      else scanParam(path);

      if (path.err.length) {
        return;
      }
      path.data.push(path.param);

      skipSpaces(path);

      // after ',' param is mandatory
      if (path.index < max && pathValue.charCodeAt(path.index) === 0x2C/* , */) {
        path.index += 1;
        skipSpaces(path);
      }
    }

    if (path.index >= path.max) {
      break;
    }

    // Stop on next segment
    if (!isDigitStart(pathValue.charCodeAt(path.index))) {
      break;
    }
  }

  finalizeSegment(path);
}/**
 * Returns a clone of an existing `pathArray`.
 *
 * @param {SVGPathCommander.pathArray | SVGPathCommander.pathSegment} path the source `pathArray`
 * @returns {any} the cloned `pathArray`
 */
function clonePath(path) {
  return path.map((x) => (Array.isArray(x) ? [...x] : x));
}/**
 * The `PathParser` is used by the `parsePathString` static method
 * to generate a `pathArray`.
 *
 * @param {string} pathString
 */
function PathParser(pathString) {
  /** @type {SVGPathCommander.pathArray} */
  // @ts-ignore
  this.segments = [];
  /** @type {string} */
  this.pathValue = pathString;
  /** @type {number} */
  this.max = pathString.length;
  /** @type {number} */
  this.index = 0;
  /** @type {number} */
  this.param = 0.0;
  /** @type {number} */
  this.segmentStart = 0;
  /** @type {any} */
  this.data = [];
  /** @type {string} */
  this.err = '';
}/**
 * Iterates an array to check if it's an actual `pathArray`.
 *
 * @param {string | SVGPathCommander.pathArray} path the `pathArray` to be checked
 * @returns {boolean} iteration result
 */
function isPathArray(path) {
  return Array.isArray(path) && path.every((seg) => {
    const lk = seg[0].toLowerCase();
    return paramsCount[lk] === seg.length - 1 && 'achlmqstvz'.includes(lk);
  });
}/**
 * Parses a path string value and returns an array
 * of segments we like to call `pathArray`.
 *
 * @param {SVGPathCommander.pathArray | string} pathInput the string to be parsed
 * @returns {SVGPathCommander.pathArray} the resulted `pathArray`
 */
function parsePathString(pathInput) {
  if (isPathArray(pathInput)) {
    // @ts-ignore -- isPathArray also checks if it's an `Array`
    return clonePath(pathInput);
  }

  // @ts-ignore -- pathInput is now string
  const path = new PathParser(pathInput);

  skipSpaces(path);

  while (path.index < path.max && !path.err.length) {
    scanSegment(path);
  }

  if (path.err.length) {
    // @ts-ignore
    path.segments = [];
  } else if (path.segments.length) {
    if (!'mM'.includes(path.segments[0][0])) {
      path.err = `${invalidPathValue}: missing M/m`;
      // @ts-ignore
      path.segments = [];
    } else {
      path.segments[0][0] = 'M';
    }
  }

  return path.segments;
}/**
 * Iterates an array to check if it's a `pathArray`
 * with all absolute values.
 *
 * @param {string | SVGPathCommander.pathArray} path the `pathArray` to be checked
 * @returns {boolean} iteration result
 */
function isAbsoluteArray(path) {
  return isPathArray(path)
    // @ts-ignore -- `isPathArray` also checks if it's `Array`
    && path.every((x) => x[0] === x[0].toUpperCase());
}/**
 * Parses a path string value or object and returns an array
 * of segments, all converted to absolute values.
 *
 * @param {string | SVGPathCommander.pathArray} pathInput the path string | object
 * @returns {SVGPathCommander.absoluteArray} the resulted `pathArray` with absolute values
 */
function pathToAbsolute(pathInput) {
  if (isAbsoluteArray(pathInput)) {
    // @ts-ignore -- `isAbsoluteArray` checks if it's `pathArray`
    return clonePath(pathInput);
  }

  const path = parsePathString(pathInput);
  let x = 0; let y = 0;
  let mx = 0; let my = 0;

  // @ts-ignore -- the `absoluteSegment[]` is for sure an `absolutePath`
  return path.map((segment) => {
    const values = segment.slice(1).map(Number);
    const [pathCommand] = segment;
    /** @type {SVGPathCommander.absoluteCommand} */
    // @ts-ignore
    const absCommand = pathCommand.toUpperCase();

    if (pathCommand === 'M') {
      [x, y] = values;
      mx = x;
      my = y;
      return ['M', x, y];
    }
    /** @type {SVGPathCommander.absoluteSegment} */
    // @ts-ignore
    let absoluteSegment = [];

    if (pathCommand !== absCommand) {
      switch (absCommand) {
        case 'A':
          absoluteSegment = [
            absCommand, values[0], values[1], values[2],
            values[3], values[4], values[5] + x, values[6] + y];
          break;
        case 'V':
          absoluteSegment = [absCommand, values[0] + y];
          break;
        case 'H':
          absoluteSegment = [absCommand, values[0] + x];
          break;
        default: {
          // use brakets for `eslint: no-case-declaration`
          // https://stackoverflow.com/a/50753272/803358
          const absValues = values.map((n, j) => n + (j % 2 ? y : x));
          // @ts-ignore for n, l, c, s, q, t
          absoluteSegment = [absCommand, ...absValues];
        }
      }
    } else {
      // @ts-ignore
      absoluteSegment = [absCommand, ...values];
    }

    const segLength = absoluteSegment.length;
    switch (absCommand) {
      case 'Z':
        x = mx;
        y = my;
        break;
      case 'H':
        // @ts-ignore
        [, x] = absoluteSegment;
        break;
      case 'V':
        // @ts-ignore
        [, y] = absoluteSegment;
        break;
      default:
        // @ts-ignore
        x = absoluteSegment[segLength - 2];
        // @ts-ignore
        y = absoluteSegment[segLength - 1];

        if (absCommand === 'M') {
          mx = x;
          my = y;
        }
    }
    return absoluteSegment;
  });
}/**
 * Splits an extended A (arc-to) segment into two cubic-bezier segments.
 *
 * @param {SVGPathCommander.pathArray} path the `pathArray` this segment belongs to
 * @param {string[]} allPathCommands all previous path commands
 * @param {number} i the segment index
 */

function fixArc(path, allPathCommands, i) {
  if (path[i].length > 7) {
    path[i].shift();
    const segment = path[i];
    let ni = i; // ESLint
    while (segment.length) {
      // if created multiple C:s, their original seg is saved
      allPathCommands[i] = 'A';
      // @ts-ignore
      path.splice(ni += 1, 0, ['C', ...segment.splice(0, 6)]);
    }
    path.splice(i, 1);
  }
}/**
 * Returns the missing control point from an
 * T (shorthand quadratic bezier) segment.
 *
 * @param {number} x1 curve start x
 * @param {number} y1 curve start y
 * @param {number} qx control point x
 * @param {number} qy control point y
 * @param {string} prevCommand the previous path command
 * @returns {{qx: number, qy: number}}} the missing control point
 */
function shorthandToQuad(x1, y1, qx, qy, prevCommand) {
  return 'QT'.includes(prevCommand)
    ? { qx: x1 * 2 - qx, qy: y1 * 2 - qy }
    : { qx: x1, qy: y1 };
}/**
 * Returns the missing control point from an
 * S (shorthand cubic bezier) segment.
 *
 * @param {number} x1 curve start x
 * @param {number} y1 curve start y
 * @param {number} x2 curve end x
 * @param {number} y2 curve end y
 * @param {string} prevCommand the previous path command
 * @returns {{x1: number, y1: number}}} the missing control point
 */
function shorthandToCubic(x1, y1, x2, y2, prevCommand) {
  return 'CS'.includes(prevCommand)
    ? { x1: x1 * 2 - x2, y1: y1 * 2 - y2 }
    : { x1, y1 };
}/**
 * Normalizes a single segment of a `pathArray` object.
 *
 * @param {SVGPathCommander.pathSegment} segment the segment object
 * @param {any} params the coordinates of the previous segment
 * @param {string} prevCommand the path command of the previous segment
 * @returns {SVGPathCommander.normalSegment} the normalized segment
 */
function normalizeSegment(segment, params, prevCommand) {
  const [pathCommand] = segment;
  const {
    x1: px1, y1: py1, x2: px2, y2: py2,
  } = params;
  const values = segment.slice(1).map(Number);
  let result = segment;

  if (!'TQ'.includes(pathCommand)) {
    // optional but good to be cautious
    params.qx = null;
    params.qy = null;
  }

  if (pathCommand === 'H') {
    result = ['L', segment[1], py1];
  } else if (pathCommand === 'V') {
    result = ['L', px1, segment[1]];
  } else if (pathCommand === 'S') {
    const { x1, y1 } = shorthandToCubic(px1, py1, px2, py2, prevCommand);
    params.x1 = x1;
    params.y1 = y1;
    // @ts-ignore
    result = ['C', x1, y1, ...values];
  } else if (pathCommand === 'T') {
    const { qx, qy } = shorthandToQuad(px1, py1, params.qx, params.qy, prevCommand);
    params.qx = qx;
    params.qy = qy;
    // @ts-ignore
    result = ['Q', qx, qy, ...values];
  } else if (pathCommand === 'Q') {
    const [nqx, nqy] = values;
    params.qx = nqx;
    params.qy = nqy;
  }

  // @ts-ignore -- we-re switching `pathSegment` type
  return result;
}/**
 * Iterates an array to check if it's a `pathArray`
 * with all segments are in non-shorthand notation
 * with absolute values.
 *
 * @param {string | SVGPathCommander.pathArray} path the `pathArray` to be checked
 * @returns {boolean} iteration result
 */
function isNormalizedArray(path) {
  // @ts-ignore -- `isAbsoluteArray` also checks if it's `Array`
  return isAbsoluteArray(path) && path.every((seg) => 'ACLMQZ'.includes(seg[0]));
}/**
 * @type {SVGPathCommander.parserParams}
 */
const paramsParser = {
  x1: 0, y1: 0, x2: 0, y2: 0, x: 0, y: 0, qx: null, qy: null,
};/**
 * Normalizes a `path` object for further processing:
 * * convert segments to absolute values
 * * convert shorthand path commands to their non-shorthand notation
 *
 * @param {string | SVGPathCommander.pathArray} pathInput the string to be parsed or 'pathArray'
 * @returns {SVGPathCommander.normalArray} the normalized `pathArray`
 */
function normalizePath(pathInput) {
  if (isNormalizedArray(pathInput)) {
    // @ts-ignore -- `isNormalizedArray` checks if it's `pathArray`
    return clonePath(pathInput);
  }

  /** @type {SVGPathCommander.normalArray} */
  // @ts-ignore -- `absoluteArray` will become a `normalArray`
  const path = pathToAbsolute(pathInput);
  const params = { ...paramsParser };
  const allPathCommands = [];
  const ii = path.length;
  let pathCommand = '';
  let prevCommand = '';

  for (let i = 0; i < ii; i += 1) {
    [pathCommand] = path[i];

    // Save current path command
    allPathCommands[i] = pathCommand;
    // Get previous path command
    if (i) prevCommand = allPathCommands[i - 1];
    // Previous path command is used to normalizeSegment
    // @ts-ignore -- expected on normalization
    path[i] = normalizeSegment(path[i], params, prevCommand);

    const segment = path[i];
    const seglen = segment.length;

    params.x1 = +segment[seglen - 2];
    params.y1 = +segment[seglen - 1];
    params.x2 = +(segment[seglen - 4]) || params.x1;
    params.y2 = +(segment[seglen - 3]) || params.y1;
  }

  return path;
}/**
 * Checks a `pathArray` for an unnecessary `Z` segment
 * and returns a new `pathArray` without it.
 *
 * The `pathInput` must be a single path, without
 * sub-paths. For multi-path `<path>` elements,
 * use `splitPath` first and apply this utility on each
 * sub-path separately.
 *
 * @param {SVGPathCommander.pathArray | string} pathInput the `pathArray` source
 * @return {SVGPathCommander.pathArray} a fixed `pathArray`
 */
function fixPath(pathInput) {
  const pathArray = parsePathString(pathInput);
  const normalArray = normalizePath(pathArray);
  const { length } = pathArray;
  const isClosed = normalArray.slice(-1)[0][0] === 'Z';
  const segBeforeZ = isClosed ? length - 2 : length - 1;

  const [mx, my] = normalArray[0].slice(1);
  const [x, y] = normalArray[segBeforeZ].slice(-2);

  if (isClosed && mx === x && my === y) {
    // @ts-ignore -- `pathSegment[]` is quite a `pathArray`
    return pathArray.slice(0, -1);
  }
  return pathArray;
}/**
 * Iterates an array to check if it's a `pathArray`
 * with all C (cubic bezier) segments.
 *
 * @param {string | SVGPathCommander.pathArray} path the `Array` to be checked
 * @returns {boolean} iteration result
 */
function isCurveArray(path) {
  // @ts-ignore -- `isPathArray` also checks if it's `Array`
  return isPathArray(path) && path.every((seg) => 'MC'.includes(seg[0]));
}/**
 * Returns an {x,y} vector rotated by a given
 * angle in radian.
 *
 * @param {number} x the initial vector x
 * @param {number} y the initial vector y
 * @param {number} rad the radian vector angle
 * @returns {{x: number, y: number}} the rotated vector
 */
function rotateVector(x, y, rad) {
  const X = x * Math.cos(rad) - y * Math.sin(rad);
  const Y = x * Math.sin(rad) + y * Math.cos(rad);
  return { x: X, y: Y };
}/**
 * Converts A (arc-to) segments to C (cubic-bezier-to).
 *
 * For more information of where this math came from visit:
 * http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
 *
 * @param {number} X1 the starting x position
 * @param {number} Y1 the starting y position
 * @param {number} RX x-radius of the arc
 * @param {number} RY y-radius of the arc
 * @param {number} angle x-axis-rotation of the arc
 * @param {number} LAF large-arc-flag of the arc
 * @param {number} SF sweep-flag of the arc
 * @param {number} X2 the ending x position
 * @param {number} Y2 the ending y position
 * @param {number[]=} recursive the parameters needed to split arc into 2 segments
 * @return {number[]} the resulting cubic-bezier segment(s)
 */
function arcToCubic(X1, Y1, RX, RY, angle, LAF, SF, X2, Y2, recursive) {
  let x1 = X1; let y1 = Y1; let rx = RX; let ry = RY; let x2 = X2; let y2 = Y2;
  // for more information of where this Math came from visit:
  // http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
  const d120 = (Math.PI * 120) / 180;

  const rad = (Math.PI / 180) * (+angle || 0);
  /** @type {number[]} */
  let res = [];
  let xy;
  let f1;
  let f2;
  let cx;
  let cy;

  if (!recursive) {
    xy = rotateVector(x1, y1, -rad);
    x1 = xy.x;
    y1 = xy.y;
    xy = rotateVector(x2, y2, -rad);
    x2 = xy.x;
    y2 = xy.y;

    const x = (x1 - x2) / 2;
    const y = (y1 - y2) / 2;
    let h = (x * x) / (rx * rx) + (y * y) / (ry * ry);
    if (h > 1) {
      h = Math.sqrt(h);
      rx *= h;
      ry *= h;
    }
    const rx2 = rx * rx;
    const ry2 = ry * ry;

    const k = (LAF === SF ? -1 : 1)
            * Math.sqrt(Math.abs((rx2 * ry2 - rx2 * y * y - ry2 * x * x)
                / (rx2 * y * y + ry2 * x * x)));

    cx = ((k * rx * y) / ry) + ((x1 + x2) / 2);
    cy = ((k * -ry * x) / rx) + ((y1 + y2) / 2);
    // eslint-disable-next-line no-bitwise -- Impossible to satisfy no-bitwise
    f1 = (Math.asin((((y1 - cy) / ry))) * (10 ** 9) >> 0) / (10 ** 9);
    // eslint-disable-next-line no-bitwise -- Impossible to satisfy no-bitwise
    f2 = (Math.asin((((y2 - cy) / ry))) * (10 ** 9) >> 0) / (10 ** 9);

    f1 = x1 < cx ? Math.PI - f1 : f1;
    f2 = x2 < cx ? Math.PI - f2 : f2;
    if (f1 < 0) (f1 = Math.PI * 2 + f1);
    if (f2 < 0) (f2 = Math.PI * 2 + f2);
    if (SF && f1 > f2) {
      f1 -= Math.PI * 2;
    }
    if (!SF && f2 > f1) {
      f2 -= Math.PI * 2;
    }
  } else {
    [f1, f2, cx, cy] = recursive;
  }
  let df = f2 - f1;
  if (Math.abs(df) > d120) {
    const f2old = f2;
    const x2old = x2;
    const y2old = y2;
    f2 = f1 + d120 * (SF && f2 > f1 ? 1 : -1);
    x2 = cx + rx * Math.cos(f2);
    y2 = cy + ry * Math.sin(f2);
    res = arcToCubic(x2, y2, rx, ry, angle, 0, SF, x2old, y2old, [f2, f2old, cx, cy]);
  }
  df = f2 - f1;
  const c1 = Math.cos(f1);
  const s1 = Math.sin(f1);
  const c2 = Math.cos(f2);
  const s2 = Math.sin(f2);
  const t = Math.tan(df / 4);
  const hx = (4 / 3) * rx * t;
  const hy = (4 / 3) * ry * t;
  const m1 = [x1, y1];
  const m2 = [x1 + hx * s1, y1 - hy * c1];
  const m3 = [x2 + hx * s2, y2 - hy * c2];
  const m4 = [x2, y2];
  m2[0] = 2 * m1[0] - m2[0];
  m2[1] = 2 * m1[1] - m2[1];
  if (recursive) {
    return [...m2, ...m3, ...m4, ...res];
  }
  res = [...m2, ...m3, ...m4, ...res];
  const newres = [];
  for (let i = 0, ii = res.length; i < ii; i += 1) {
    newres[i] = i % 2
      ? rotateVector(res[i - 1], res[i], rad).y
      : rotateVector(res[i], res[i + 1], rad).x;
  }
  return newres;
}/**
 * Converts a Q (quadratic-bezier) segment to C (cubic-bezier).
 *
 * @param {number} x1 curve start x
 * @param {number} y1 curve start y
 * @param {number} qx control point x
 * @param {number} qy control point y
 * @param {number} x2 curve end x
 * @param {number} y2 curve end y
 * @returns {number[]} the cubic-bezier segment
 */
function quadToCubic(x1, y1, qx, qy, x2, y2) {
  const r13 = 1 / 3;
  const r23 = 2 / 3;
  return [
    r13 * x1 + r23 * qx, // cpx1
    r13 * y1 + r23 * qy, // cpy1
    r13 * x2 + r23 * qx, // cpx2
    r13 * y2 + r23 * qy, // cpy2
    x2, y2, // x,y
  ];
}/**
 * Returns the coordinates of a specified distance
 * ratio between two points.
 *
 * @param {[number, number]} a the first point coordinates
 * @param {[number, number]} b the second point coordinates
 * @param {number} t the ratio
 * @returns {[number, number]} the midpoint coordinates
 */
function midPoint(a, b, t) {
  const [ax, ay] = a; const [bx, by] = b;
  return [ax + (bx - ax) * t, ay + (by - ay) * t];
}/**
 * Returns the square root of the distance
 * between two given points.
 *
 * @param {[number, number]} a the first point coordinates
 * @param {[number, number]} b the second point coordinates
 * @returns {number} the distance value
 */
function distanceSquareRoot(a, b) {
  return Math.sqrt(
    (a[0] - b[0]) * (a[0] - b[0])
    + (a[1] - b[1]) * (a[1] - b[1]),
  );
}/**
 * Returns the length of a line (L,V,H,Z) segment,
 * or a point at a given length.
 *
 * @param {number} x1 the starting point X
 * @param {number} y1 the starting point Y
 * @param {number} x2 the ending point X
 * @param {number} y2 the ending point Y
 * @param {number=} distance the distance to point
 * @returns {{x: number, y: number} | number} the segment length or point
 */
function segmentLineFactory(x1, y1, x2, y2, distance) {
  const length = distanceSquareRoot([x1, y1], [x2, y2]);
  const margin = 0.001;

  if (typeof distance === 'number') {
    if (distance < margin) {
      return { x: x1, y: y1 };
    }
    if (distance > length + margin) {
      return { x: x2, y: y2 };
    }
    const [x, y] = midPoint([x1, y1], [x2, y2], distance / length);
    return { x, y };
  }
  return length;
}/**
 * Converts an L (line-to) segment to C (cubic-bezier).
 *
 * @param {number} x1 line start x
 * @param {number} y1 line start y
 * @param {number} x2 line end x
 * @param {number} y2 line end y
 * @returns {number[]} the cubic-bezier segment
 */
function lineToCubic(x1, y1, x2, y2) {
  const t = 0.5;
  /** @type {[number, number]} */
  const p0 = [x1, y1];
  /** @type {[number, number]} */
  const p1 = [x2, y2];
  const p2 = midPoint(p0, p1, t);
  const p3 = midPoint(p1, p2, t);
  const p4 = midPoint(p2, p3, t);
  const p5 = midPoint(p3, p4, t);
  const p6 = midPoint(p4, p5, t);
  const seg1 = [...p0, ...p2, ...p4, ...p6, t];
  // @ts-ignore
  const cp1 = segmentLineFactory(...seg1);
  const seg2 = [...p6, ...p5, ...p3, ...p1, 0];
  // @ts-ignore
  const cp2 = segmentLineFactory(...seg2);

  // @ts-ignore
  return [cp1.x, cp1.y, cp2.x, cp2.y, x2, y2];
}/**
 * Converts any segment to C (cubic-bezier).
 *
 * @param {SVGPathCommander.pathSegment} segment the source segment
 * @param {SVGPathCommander.parserParams} params the source segment parameters
 * @returns {SVGPathCommander.cubicSegment | SVGPathCommander.MSegment} the cubic-bezier segment
 */
function segmentToCubic(segment, params) {
  const [pathCommand] = segment;
  const values = segment.slice(1).map((n) => +n);
  const [x, y] = values;
  let args;
  const {
    x1: px1, y1: py1, x: px, y: py,
  } = params;

  if (!'TQ'.includes(pathCommand)) {
    params.qx = null;
    params.qy = null;
  }

  switch (pathCommand) {
    case 'M':
      params.x = x;
      params.y = y;
      return segment;
    case 'A':
      args = [px1, py1, ...values];
      // @ts-ignore -- relax, the utility will return 6 numbers
      return ['C', ...arcToCubic(...args)];
    case 'Q':
      params.qx = x;
      params.qy = y;
      args = [px1, py1, ...values];
      // @ts-ignore -- also returning 6 numbers
      return ['C', ...quadToCubic(...args)];
    case 'L':
      // @ts-ignore -- also returning 6 numbers
      return ['C', ...lineToCubic(px1, py1, x, y)];
    case 'Z':
      // @ts-ignore -- also returning 6 numbers
      return ['C', ...lineToCubic(px1, py1, px, py)];
  }
  // @ts-ignore -- we're switching `pathSegment` type
  return segment;
}/**
 * Parses a path string value or 'pathArray' and returns a new one
 * in which all segments are converted to cubic-bezier.
 *
 * In addition, un-necessary `Z` segment is removed if previous segment
 * extends to the `M` segment.
 *
 * @param {string | SVGPathCommander.pathArray} pathInput the string to be parsed or 'pathArray'
 * @returns {SVGPathCommander.curveArray} the resulted `pathArray` converted to cubic-bezier
 */
function pathToCurve(pathInput) {
  if (isCurveArray(pathInput)) {
    // @ts-ignore -- `isCurveArray` checks if it's `pathArray`
    return clonePath(pathInput);
  }

  const path = fixPath(normalizePath(pathInput));
  const params = { ...paramsParser };
  const allPathCommands = [];
  let pathCommand = ''; // ts-lint
  let ii = path.length;

  for (let i = 0; i < ii; i += 1) {
    [pathCommand] = path[i];
    allPathCommands[i] = pathCommand;

    path[i] = segmentToCubic(path[i], params);

    fixArc(path, allPathCommands, i);
    ii = path.length;

    const segment = path[i];
    const seglen = segment.length;
    params.x1 = +segment[seglen - 2];
    params.y1 = +segment[seglen - 1];
    params.x2 = +(segment[seglen - 4]) || params.x1;
    params.y2 = +(segment[seglen - 3]) || params.y1;
  }

  // @ts-ignore
  return path;
}/**
 * SVGPathCommander default options
 * @type {SVGPathCommander.options}
 */
const defaultOptions = {
  origin: [0, 0, 0],
  round: 4,
};/**
 * Rounds the values of a `pathArray` instance to
 * a specified amount of decimals and returns it.
 *
 * @param {SVGPathCommander.pathArray} path the source `pathArray`
 * @param {number | boolean} roundOption the amount of decimals to round numbers to
 * @returns {SVGPathCommander.pathArray} the resulted `pathArray` with rounded values
 */
function roundPath(path, roundOption) {
  let { round } = defaultOptions;
  if (roundOption === false || round === false) return clonePath(path);
  round = roundOption >= 1 ? roundOption : round;
  // to round values to the power
  // the `round` value must be integer
  // @ts-ignore
  const pow = round >= 1 ? (10 ** round) : 1;

  // @ts-ignore -- `pathSegment[]` is `pathArray`
  return path.map((pi) => {
    const values = pi.slice(1).map(Number)
      .map((n) => (n % 1 === 0 ? n : Math.round(n * pow) / pow));
    return [pi[0], ...values];
  });
}/**
 * Returns a valid `d` attribute string value created
 * by rounding values and concatenating the `pathArray` segments.
 *
 * @param {SVGPathCommander.pathArray} path the `pathArray` object
 * @param {any} round amount of decimals to round values to
 * @returns {string} the concatenated path string
 */
function pathToString(path, round) {
  return roundPath(path, round)
    .map((x) => x[0] + x.slice(1).join(' ')).join('');
}/**
 * Reverses all segments and their values from a `pathArray`
 * which consists of only C (cubic-bezier) path commands.
 *
 * @param {SVGPathCommander.curveArray} path the source `pathArray`
 * @returns {SVGPathCommander.curveArray} the reversed `pathArray`
 */
function reverseCurve(path) {
  const rotatedCurve = path.slice(1)
    .map((x, i, curveOnly) => (!i
      ? [...path[0].slice(1), ...x.slice(1)]
      : [...curveOnly[i - 1].slice(-2), ...x.slice(1)]))
    .map((x) => x.map((_, i) => x[x.length - i - 2 * (1 - (i % 2))]))
    .reverse();

  // @ts-ignore -- expected on reverse operations
  return [['M', ...rotatedCurve[0].slice(0, 2)],
    ...rotatedCurve.map((x) => ['C', ...x.slice(2)])];
}/**
 * Returns the area of a single cubic-bezier segment.
 *
 * http://objectmix.com/graphics/133553-area-closed-bezier-curve.html
 *
 * @param {number} x1 the starting point X
 * @param {number} y1 the starting point Y
 * @param {number} c1x the first control point X
 * @param {number} c1y the first control point Y
 * @param {number} c2x the second control point X
 * @param {number} c2y the second control point Y
 * @param {number} x2 the ending point X
 * @param {number} y2 the ending point Y
 * @returns {number} the area of the cubic-bezier segment
 */
function getCubicSegArea(x1, y1, c1x, c1y, c2x, c2y, x2, y2) {
  return (3 * ((y2 - y1) * (c1x + c2x) - (x2 - x1) * (c1y + c2y)
           + (c1y * (x1 - c2x)) - (c1x * (y1 - c2y))
           + (y2 * (c2x + x1 / 3)) - (x2 * (c2y + y1 / 3)))) / 20;
}

/**
 * Returns the area of a shape.
 * @author Jürg Lehni & Jonathan Puckey
 *
 * @see https://github.com/paperjs/paper.js/blob/develop/src/path/Path.js
 *
 * @param {SVGPathCommander.pathArray} path the shape `pathArray`
 * @returns {number} the length of the cubic-bezier segment
 */
function getPathArea(path) {
  let x = 0; let y = 0; let len = 0;

  return pathToCurve(path).map((seg) => {
    switch (seg[0]) {
      case 'M':
        [, x, y] = seg;
        return 0;
      default:
        // @ts-ignore -- the utility will have proper amount of params
        len = getCubicSegArea(x, y, ...seg.slice(1));
        // @ts-ignore -- the segment always has numbers
        [x, y] = seg.slice(-2);
        return len;
    }
  }).reduce((a, b) => a + b, 0);
}/**
 * Check if a path is drawn clockwise and returns true if so,
 * false otherwise.
 *
 * @param {SVGPathCommander.pathArray} path the path string or `pathArray`
 * @returns {boolean} true when clockwise or false if not
 */
function getDrawDirection(path) {
  return getPathArea(pathToCurve(path)) >= 0;
}/**
 * Split a cubic-bezier segment into two.
 *
 * @param {number[]} pts the cubic-bezier parameters
 * @return {SVGPathCommander.cubicSegment[]} two new cubic-bezier segments
 */
function splitCubic(pts/* , ratio */) {
  const t = /* ratio || */ 0.5;
  const p0 = pts.slice(0, 2);
  const p1 = pts.slice(2, 4);
  const p2 = pts.slice(4, 6);
  const p3 = pts.slice(6, 8);
  // @ts-ignore
  const p4 = midPoint(p0, p1, t);
  // @ts-ignore
  const p5 = midPoint(p1, p2, t);
  // @ts-ignore
  const p6 = midPoint(p2, p3, t);
  const p7 = midPoint(p4, p5, t);
  const p8 = midPoint(p5, p6, t);
  const p9 = midPoint(p7, p8, t);

  return [
    ['C', ...p4, ...p7, ...p9],
    // @ts-ignore
    ['C', ...p8, ...p6, ...p3],
  ];
}/**
 * Split a path into an `Array` of sub-path strings.
 *
 * In the process, values are converted to absolute
 * for visual consistency.
 *
 * @param {SVGPathCommander.pathArray | string} pathInput the source `pathArray`
 * @return {string[]} an array with all sub-path strings
 */
function splitPath(pathInput) {
  return pathToString(pathToAbsolute(pathInput), 0)
    .replace(/(m|M)/g, '|$1')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s);
}/**
 * Returns a point at a given length of a C (cubic-bezier) segment.
 *
 * @param {number} x1 the starting point X
 * @param {number} y1 the starting point Y
 * @param {number} c1x the first control point X
 * @param {number} c1y the first control point Y
 * @param {number} c2x the second control point X
 * @param {number} c2y the second control point Y
 * @param {number} x2 the ending point X
 * @param {number} y2 the ending point Y
 * @param {number} t a [0-1] ratio
 * @returns {{x: number, y: number}} the cubic-bezier segment length
 */
function getPointAtCubicSegmentLength(x1, y1, c1x, c1y, c2x, c2y, x2, y2, t) {
  const t1 = 1 - t;
  return {
    x: (t1 ** 3) * x1
      + 3 * (t1 ** 2) * t * c1x
      + 3 * t1 * (t ** 2) * c2x
      + (t ** 3) * x2,
    y: (t1 ** 3) * y1
      + 3 * (t1 ** 2) * t * c1y
      + 3 * t1 * (t ** 2) * c2y
      + (t ** 3) * y2,
  };
}

/**
 * Returns the length of a C (cubic-bezier) segment,
 * or an {x,y} point at a given length.
 *
 * @param {number} x1 the starting point X
 * @param {number} y1 the starting point Y
 * @param {number} c1x the first control point X
 * @param {number} c1y the first control point Y
 * @param {number} c2x the second control point X
 * @param {number} c2y the second control point Y
 * @param {number} x2 the ending point X
 * @param {number} y2 the ending point Y
 * @param {number=} distance the point distance
 * @returns {{x: number, y: number} | number} the segment length or point
 */
function segmentCubicFactory(x1, y1, c1x, c1y, c2x, c2y, x2, y2, distance) {
  let x = x1; let y = y1;
  const lengthMargin = 0.001;
  let totalLength = 0;
  let prev = [x1, y1, totalLength];
  /** @type {[number, number]} */
  let cur = [x1, y1];
  let t = 0;

  if (typeof distance === 'number' && distance < lengthMargin) {
    return { x, y };
  }

  const n = 100;
  for (let j = 0; j <= n; j += 1) {
    t = j / n;

    ({ x, y } = getPointAtCubicSegmentLength(x1, y1, c1x, c1y, c2x, c2y, x2, y2, t));
    totalLength += distanceSquareRoot(cur, [x, y]);
    cur = [x, y];

    if (typeof distance === 'number' && totalLength >= distance) {
      const dv = (totalLength - distance) / (totalLength - prev[2]);

      return {
        x: cur[0] * (1 - dv) + prev[0] * dv,
        y: cur[1] * (1 - dv) + prev[1] * dv,
      };
    }
    prev = [x, y, totalLength];
  }

  if (typeof distance === 'number' && distance >= totalLength) {
    return { x: x2, y: y2 };
  }
  return totalLength;
}// Component Functions

/**
 * Sets the property update function.
 * @param {string} tweenProp the `path` property
 */
function onStartCubicMorph(tweenProp) {
  if (!KEC[tweenProp] && this.valuesEnd[tweenProp]) {
    KEC[tweenProp] = function updateMorph(elem, a, b, v) {
      const curve = [];
      const path1 = a.curve;
      const path2 = b.curve;
      for (let i = 0, l = path2.length; i < l; i += 1) { // each path command
        curve.push([path1[i][0]]);
        for (let j = 1, l2 = path1[i].length; j < l2; j += 1) { // each command coordinate
          /* eslint-disable-next-line no-bitwise -- impossible to satisfy */
          curve[i].push((numbers(path1[i][j], path2[i][j], v) * 1000 >> 0) / 1000);
        }
      }
      elem.setAttribute('d', v === 1 ? b.original : pathToString(curve));
    };
  }
}// Component Util
/**
 * Returns first `pathArray` from multi-paths path.
 * @param {SVGPathCommander.pathArray | string} source the source `pathArray` or string
 * @returns {KUTE.curveSpecs[]} an `Array` with a custom tuple for `equalizeSegments`
 */
function getCurveArray(source) {
  return pathToCurve(splitPath(source)[0])
    .map((segment, i, pathArray) => {
      const segmentData = i && [...pathArray[i - 1].slice(-2), ...segment.slice(1)];
      const curveLength = i ? segmentCubicFactory(...segmentData) : 0;

      let subsegs;
      if (i) {
        // must be [segment,segment]
        subsegs = curveLength ? splitCubic(segmentData) : [segment, segment];
      } else {
        subsegs = [segment];
      }

      return {
        s: segment,
        ss: subsegs,
        l: curveLength,
      };
    });
}

/**
 * Returns two `curveArray` with same amount of segments.
 * @param {SVGPathCommander.curveArray} path1 the first `curveArray`
 * @param {SVGPathCommander.curveArray} path2 the second `curveArray`
 * @param {number} TL the maximum `curveArray` length
 * @returns {SVGPathCommander.curveArray[]} equalized segments
 */
function equalizeSegments(path1, path2, TL) {
  const c1 = getCurveArray(path1);
  const c2 = getCurveArray(path2);
  const L1 = c1.length;
  const L2 = c2.length;
  const l1 = c1.filter((x) => x.l).length;
  const l2 = c2.filter((x) => x.l).length;
  const m1 = c1.filter((x) => x.l).reduce((a, { l }) => a + l, 0) / l1 || 0;
  const m2 = c2.filter((x) => x.l).reduce((a, { l }) => a + l, 0) / l2 || 0;
  const tl = TL || Math.max(L1, L2);
  const mm = [m1, m2];
  const dif = [tl - L1, tl - L2];
  let canSplit = 0;
  const result = [c1, c2]
    .map((x, i) => (x.l === tl
      ? x.map((y) => y.s)
      : x.map((y, j) => {
        canSplit = j && dif[i] && y.l >= mm[i];
        dif[i] -= canSplit ? 1 : 0;
        return canSplit ? y.ss : [y.s];
      }).flat()));

  return result[0].length === result[1].length
    ? result
    : equalizeSegments(result[0], result[1], tl);
}

/**
 * Returns all possible path rotations for `curveArray`.
 * @param {SVGPathCommander.curveArray} a the source `curveArray`
 * @returns {SVGPathCommander.curveArray[]} all rotations for source
 */
function getRotations(a) {
  const segCount = a.length;
  const pointCount = segCount - 1;

  return a.map((_, idx) => a.map((__, i) => {
    let oldSegIdx = idx + i;
    let seg;

    if (i === 0 || (a[oldSegIdx] && a[oldSegIdx][0] === 'M')) {
      seg = a[oldSegIdx];
      return ['M', ...seg.slice(-2)];
    }
    if (oldSegIdx >= segCount) oldSegIdx -= pointCount;
    return a[oldSegIdx];
  }));
}

/**
 * Returns the `curveArray` rotation for the best morphing animation.
 * @param {SVGPathCommander.curveArray} a the target `curveArray`
 * @param {SVGPathCommander.curveArray} b the reference `curveArray`
 * @returns {SVGPathCommander.curveArray} the best `a` rotation
 */
function getRotatedCurve(a, b) {
  const segCount = a.length - 1;
  const lineLengths = [];
  let computedIndex = 0;
  let sumLensSqrd = 0;
  const rotations = getRotations(a);

  rotations.forEach((_, i) => {
    a.slice(1).forEach((__, j) => {
      sumLensSqrd += distanceSquareRoot(a[(i + j) % segCount].slice(-2), b[j % segCount].slice(-2));
    });
    lineLengths[i] = sumLensSqrd;
    sumLensSqrd = 0;
  });

  computedIndex = lineLengths.indexOf(Math.min.apply(null, lineLengths));

  return rotations[computedIndex];
}

// Component Functions
/**
 * Returns the current `d` attribute value.
 * @returns {string}
 */
function getCubicMorph(/* tweenProp, value */) {
  return this.element.getAttribute('d');
}

/**
 * Returns the property tween object.
 * @see KUTE.curveObject
 *
 * @param {string} _ is the `path` property name, not needed
 * @param {string | KUTE.curveObject} value the `path` property value
 * @returns {KUTE.curveObject}
 */
function prepareCubicMorph(/* tweenProp, */_, value) {
  // get path d attribute or create a path from string value
  const pathObject = {};
  // remove newlines, they break some JSON strings
  const pathReg = new RegExp('\\n', 'ig');

  let el = null;
  if (value instanceof SVGElement) {
    el = value;
  } else if (/^\.|^#/.test(value)) {
    el = selector(value);
  }

  // make sure to return pre-processed values
  if (typeof (value) === 'object' && value.curve) {
    return value;
  } if (el && /path|glyph/.test(el.tagName)) {
    pathObject.original = el.getAttribute('d').replace(pathReg, '');
  // maybe it's a string path already
  } else if (!el && typeof (value) === 'string') {
    pathObject.original = value.replace(pathReg, '');
  }
  return pathObject;
}

/**
 * Enables the `to()` method by preparing the tween object in advance.
 * @param {string} tweenProp is `path` tween property, but it's not needed
 */
function crossCheckCubicMorph(tweenProp/** , value */) {
  if (this.valuesEnd[tweenProp]) {
    const pathCurve1 = this.valuesStart[tweenProp].curve;
    const pathCurve2 = this.valuesEnd[tweenProp].curve;

    if (!pathCurve1 || !pathCurve2
      || (pathCurve1 && pathCurve2 && pathCurve1[0][0] === 'M' && pathCurve1.length !== pathCurve2.length)) {
      const path1 = this.valuesStart[tweenProp].original;
      const path2 = this.valuesEnd[tweenProp].original;
      const curves = equalizeSegments(path1, path2);
      const curve0 = getDrawDirection(curves[0]) !== getDrawDirection(curves[1])
        ? reverseCurve(curves[0])
        : clonePath(curves[0]);

      this.valuesStart[tweenProp].curve = curve0;
      this.valuesEnd[tweenProp].curve = getRotatedCurve(curves[1], curve0);
    }
  }
}

// All Component Functions
const svgCubicMorphFunctions = {
  prepareStart: getCubicMorph,
  prepareProperty: prepareCubicMorph,
  onStart: onStartCubicMorph,
  crossCheck: crossCheckCubicMorph,
};

// Component Full
const svgCubicMorph = {
  component: 'svgCubicMorph',
  property: 'path',
  defaultValue: [],
  Interpolate: { numbers, pathToString },
  functions: svgCubicMorphFunctions,
  // export utils to global for faster execution
  Util: {
    pathToCurve,
    pathToAbsolute,
    pathToString,
    parsePathString,
    getRotatedCurve,
    getRotations,
    equalizeSegments,
    reverseCurve,
    clonePath,
    getDrawDirection,
    segmentCubicFactory,
    splitCubic,
    splitPath,
    fixPath,
    getCurveArray,
  },
};/**
 * A global namespace for `DOMContentLoaded` event.
 * @type {string}
 */
const DOMContentLoadedEvent = 'DOMContentLoaded';/**
 * Add eventListener to an `HTMLElement` | `Document` target.
 *
 * @param {HTMLElement | Document} element event.target
 * @param {string} eventName event.type
 * @param {EventListener} handler callback
 * @param {EventListenerOptions | boolean | undefined} options other event options
 */
function on(element, eventName, handler, options) {
  const ops = options || false;
  element.addEventListener(eventName, handler, ops);
}/**
 * Remove eventListener from an `HTMLElement` | `Document` target.
 *
 * @param {HTMLElement | Document} element event.target
 * @param {string} eventName event.type
 * @param {EventListener} handler callback
 * @param {EventListenerOptions | boolean | undefined} options other event options
 */
function off(element, eventName, handler, options) {
  const ops = options || false;
  element.removeEventListener(eventName, handler, ops);
}/**
 * Add an `eventListener` to an `HTMLElement` | `Document` target
 * and remove it once callback is called.
 *
 * @param {HTMLElement | Document} element event.target
 * @param {string} eventName event.type
 * @param {EventListener} handler callback
 * @param {EventListenerOptions | boolean | undefined} options other event options
 */
function one(element, eventName, handler, options) {
/**
 * Wrap the handler for easy on -> off
 * @param {Event} e the Event object
 */
  function handlerWrapper(e) {
    if (e.target === element) {
      handler.apply(element, [e]);
      off(element, eventName, handlerWrapper, options);
    }
  }
  on(element, eventName, handlerWrapper, options);
}/**
 * A global namespace for passive events support.
 * @type {boolean}
 */
(() => {
  let result = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get() {
        result = true;
        return result;
      },
    });
    one(document, DOMContentLoadedEvent, () => {}, opts);
  } catch (e) {
    throw Error('Passive events are not supported');
  }

  return result;
})();// true scroll container
// very important and specific to the component
navigator && /(EDGE|Mac)/i.test(navigator.userAgent)
  ? document.body
  : document.documentElement;// Component Properties
const shadowProps$1 = ['boxShadow', 'textShadow'];

// Component Functions
/**
 * Sets the property update function.
 * @param {string} tweenProp the property name
 */
function onStartShadow(tweenProp) {
  if (this.valuesEnd[tweenProp] && !KEC[tweenProp]) {
    KEC[tweenProp] = (elem, a, b, v) => {
      // let's start with the numbers | set unit | also determine inset
      const params = [];
      const unit = 'px';
      const sl = tweenProp === 'textShadow' ? 3 : 4;
      const colA = sl === 3 ? a[3] : a[4];
      const colB = sl === 3 ? b[3] : b[4];
      const inset = (a[5] && a[5] !== 'none') || (b[5] && b[5] !== 'none') ? ' inset' : false;

      for (let i = 0; i < sl; i += 1) {
        /* eslint no-bitwise: ["error", { "allow": [">>"] }] */
        params.push(((numbers(a[i], b[i], v) * 1000 >> 0) / 1000) + unit);
      }
      // the final piece of the puzzle, the DOM update
      // eslint-disable-next-line no-param-reassign -- impossible to satisfy
      elem.style[tweenProp] = inset
        ? colors(colA, colB, v) + params.join(' ') + inset
        : colors(colA, colB, v) + params.join(' ');
    };
  }
}
const shadowPropOnStart$1 = {};
shadowProps$1.forEach((x) => { shadowPropOnStart$1[x] = onStartShadow; });// Component Properties
const shadowProps = ['boxShadow', 'textShadow'];

const shadowPropOnStart = {};
shadowProps.forEach((x) => { shadowPropOnStart[x] = onStartShadow; });// Component Properties
const textProperties = ['fontSize', 'lineHeight', 'letterSpacing', 'wordSpacing'];
const textOnStart$1 = {};

/**
 * Sets the property update function.
 * @param {string} tweenProp the property name
 */
function textPropOnStart(tweenProp) {
  if (this.valuesEnd[tweenProp] && !KEC[tweenProp]) {
    KEC[tweenProp] = (elem, a, b, v) => {
      // eslint-disable-next-line no-param-reassign -- impossible to satisfy
      elem.style[tweenProp] = units(a.v, b.v, b.u, v);
    };
  }
}

textProperties.forEach((tweenProp) => {
  textOnStart$1[tweenProp] = textPropOnStart;
});// Component Properties
const textProps = ['fontSize', 'lineHeight', 'letterSpacing', 'wordSpacing'];
const textOnStart = {};

// Component Functions
textProps.forEach((tweenProp) => {
  textOnStart[tweenProp] = textPropOnStart;
});// Component Values
const lowerCaseAlpha = String('abcdefghijklmnopqrstuvwxyz').split(''); // lowercase
const upperCaseAlpha = String('abcdefghijklmnopqrstuvwxyz').toUpperCase().split(''); // uppercase
const nonAlpha = String("~!@#$%^&*()_+{}[];'<>,./?=-").split(''); // symbols
const numeric = String('0123456789').split(''); // numeric
const alphaNumeric = lowerCaseAlpha.concat(upperCaseAlpha, numeric); // alpha numeric
alphaNumeric.concat(nonAlpha); // all caracters
const Components = {
  BackgroundPosition,
  // BorderRadius,
  // BoxModel,
  // ClipProperty,
  // ColorProperties,
  // FilterEffects,
  HTMLAttributes: htmlAttributes,
  // OpacityProperty,
  // SVGDraw,
  SVGCubicMorph: svgCubicMorph,
  // SVGTransform,
  // ScrollProperty,
  // ShadowProperties,
  // TextProperties,
  // TextWriteProperties,
  // MatrixTransform,
};

// init components
Object.keys(Components).forEach((component) => {
  const compOps = Components[component];
  Components[component] = new AnimationDevelopment(compOps);
});var version = "2.2.2";// @ts-ignore

/**
 * A global namespace for library version.
 * @type {string}
 */
const Version = version;var indexCustom = {
  Animation: AnimationDevelopment,
  Components,

  // Tween Interface
  Tween: TweenExtra,
  fromTo,
  to,
  // Tween Collection
  TweenCollection,
  ProgressBar,
  allFromTo,
  allTo,
  // Tween Interface

  Objects,
  Util,
  Easing,
  CubicBezier,
  Render,
  Interpolate: interpolate,
  Process,
  Internals: internals,
  Selector: selector,
  Version,
};export{indexCustom as default};