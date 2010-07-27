(function($){
  var MakeSeven = function(obj){
    return new MakeSeven.fn.init(obj);
  };
  MakeSeven.fn = {
    init:function(selector){
      if(!selector) return this;
      if(typeof selector === "string"){
        elem = document.getElementById(selector);
        match = quick_expr.exec(selector);
        elem = document.getElementById(match[2]);
        if(elem){
          this.length = 1;
          this[0] = elem;
        };
        this.context = document;
        this.selector = selector;
        return this;
      };
      return MakeSeven.make_array(selector, this);
    },
    each:function(callback, args){
      return MakeSeven.each(this, callback, args);
    },
    toArray:function(){
      return slice.call(this, 0);
    },
    get:function(i){
      return i == null ? this.toArray() : (i < 0 ? this.slice(i)[0] : this[i]);
    },
    width:function(){
      return this[0].offsetWidth;
    },
    height:function(){
      return this[0].offsetHeight;
    },
    bind:function(type, handler){
      return MakeSeven(this).each(function(){
        MakeSeven.fn.add_event_listener(this, type, handler);
      });
    },
    unbind:function(type, handler){
      var self = this;
      return MakeSeven(this).each(function(){
        MakeSeven.fn.remove_event_listener(this, type, handler);
      });
    },
    add_event_listener:function(element, type, handler){
      if(element.addEventListener){
        element.addEventListener(type, handler, false);
      }else{
        if(!handler.$$guid) handler.$$guid = MakeSeven.fn.guid++;
        if(!element.events) element.events = {};
        var handlers = element.events[type];
        if(!handlers){
          handlers = element.events[type] = {};
          if(element["on" + type]){
            handlers[0] = element["on" + type];
          };
        };
        handlers[handler.$$guid] = handler;
        element["on" + type] = MakeSeven.fn.handle_event;
      };
    },
    remove_event_listener:function(element, type, handler){
      if(element.removeEventListener){
        element.removeEventListener(type, handler, false);
      }else{
        if(element.events && element.events[type]){
          delete elements.events[type][handler.$$guid];
        };
      };
    },
    handle_event:function(event){
      var return_value = true;
      event = event || MakeSeven.fn.fix_event(((this.ownerDocument || this.document || this).parentWindow || window).event);
      var handlers = this.events[event.type];
      for(var i in handlers){
        this.$$handle_event = handlers[i];
        if(this.$$handle_event(event) == false){
          return_value = false;
        };
      };
      return return_value;
    },
    fix_event:function(event){
      event.preventDefault = function(){ this.returnValue = false; };
      event.stopPropagation = function(){ this.cancelBubble = true; };
      return event;
    },
    is_ie:function(){ return !!document.all; },
    offset:function(){
      var left = 0,
          top = 0;
      var elem = this.get(0);
      if(elem.offsetParent){
        do{
          left += elem.offsetLeft;
          top += elem.offsetTop;
        }while(elem = elem.offsetParent);
      };
      return {'left':left,'top':top};
    },
    noop:function(){},
    context:undefined,
    selector:undefined,
    guid:0,
    length:0,
    push:push,
    sort:[].sort,
    splice:[].splice,
    slice:Array.prototype.slice
  };
  MakeSeven.fn.init.prototype = MakeSeven.fn;
  var toString = Object.prototype.toString,
      hasOwnProperty = Object.prototype.hasOwnProperty,
      push = Array.prototype.push,
      slice = Array.prototype.slice,
      indexOf = Array.prototype.indexOf,
      quick_expr = /^[^<]*(<[\w\W]+>)[^>]*$|^#([\w-]+)$/,
      match,
      elem,
      root_MakeSeven = MakeSeven();
  MakeSeven.is_function = MakeSeven.fn.is_function = function(obj){
    return obj.constructor.toString().indexOf('Function') == -1 ? false : true;
  };
  MakeSeven.is_array = MakeSeven.fn.is_array = function(obj){
    return obj.constructor.toString().indexOf('Array') == -1 ? false : true;
  };
  MakeSeven.inArray = MakeSeven.fn.inArray = function(elem, array){
    if(array.indexOf){
      return array.indexOf(elem);
    };
    for(var i = 0, length = array.length; i< length; i++){
      if(array[i] === elem){
        return i;
      };
    };;
    return -1;
  },
  MakeSeven.is_plain_object = MakeSeven.fn.is_plain_object = function(obj){
    if(!obj || obj.constructor.toString().indexOf('Object') == -1 || obj.nodeType || obj.setInterval) return false;
    if(obj.constructor && !obj.hasOwnProperty("constructor") && !obj.constructor.prototype.hasOwnProperty("isPrototypeOf")) return false;
    var key;
    for(key in obj){};
    return key === undefined || hasOwnProperty.call(obj, key);
  };
  MakeSeven.merge = MakeSeven.fn.merge = function(first, second){
    var i = first.length,
        j = 0;
    if(typeof second.length === "number"){
      for(var l = second.length; j < l; j++){
        first[i++] = second[j];
      };
    }else{
      while(second[j] !== undefined){
        first[i++] = second[j++];
      };
    };
    first.length = i;
    return first;
  };
  MakeSeven.each = function(object, callback, args){
    var name,
        i = 0,
        length = object.length,
        is_obj = length === undefined || MakeSeven.is_function(object);
    if(args){
      if(is_obj){
        for(name in object){
          if(callback.apply(object[name], args) === false){
            break;
          }
        };
      }else{
        for(; i < length;){
          if(callback.apply(object[i++], args) === false){
            break;
          };
        };
      };
    }else{
      if(is_obj){
        for(name in object){
          if(callback.call(object[name], name, object[name]) == false) break;
        };
      }else{
        for(var value = object[0]; i < length && callback.call(value, i, value) !== false; value = object[++i]){};
      };
    };
    return object;
  };
  MakeSeven.make_array = MakeSeven.fn.make_array = function(array, results){
    var ret = results || [];
    if(array != null){
      if(array.length == null || typeof array === "string" || MakeSeven.is_function(array) || (typeof array !== "function" && array.setInterval)){
        push.call(ret, array);
      }else{
        MakeSeven.merge(ret, array);
      };
    };
    return ret;
  };
  MakeSeven.extend = MakeSeven.fn.extend = function(){
    var target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false,
        options,
        name,
        src,
        copy,
        clone;
    if(typeof target === "boolean"){
      deep = target;
      target = arguments[1] || {};
      i == 2;
    };
    if(typeof target !== "object" && !MakeSeven.is_function(target)){
      target = {};
    };
    if(length === i){
      target = this;
      --i;
    };
    for(; i < length; i++){
      if((options = arguments[i]) != null){
        for(name in options){
          src = target[name];
          copy = options[name];
          if(target === copy) continue;
          if(deep && copy && (MakeSeven.fn.is_plain_object(copy) || MakeSeven.fn.is_array(copy))){
            clone = src && (MakeSeven.fn.is_plain_object(src) || MakeSeven.fn.is_array(src)) ? src : MakeSeven.is_array(copy) ? [] : {};
            target[name] = MakeSeven.extend(deep, clone, copy);
          }else if(copy !== undefined){
            target[name] = copy;
          };
        };
      };
    };
    return target;
  };
  MakeSeven.extend(Object,{
    keys:function(object){
      var results = [];
      for(var property in object) results[results.length] = property;
      return results;
    },
    isUndefined:function(object){
      return typeof object === "undefined";
    }
  });
  MakeSeven.extend(Array.prototype, {
    first:function(){
      return this[0];
    }
  });
  $.MakeSeven = MakeSeven;
})(window);
/*
  Base.js, version 1.1a
  Copyright 2006-2009, Dean Edwards
  License: http://www.opensource.org/licenses/mit-license.php
*/

var Base = function() {
  // dummy
};

Base.extend = function(_instance, _static) { // subclass
  var extend = Base.prototype.extend;
  
  // build the prototype
  Base._prototyping = true;
  var proto = new this;
  extend.call(proto, _instance);
  proto.base = function() {
    // call this method from any other method to invoke that method's ancestor
  };
  delete Base._prototyping;
  
  // create the wrapper for the constructor function
  //var constructor = proto.constructor.valueOf(); //-dean
  var constructor = proto.constructor;
  var klass = proto.constructor = function() {
    if (!Base._prototyping) {
      if (this._constructing || this.constructor == klass) { // instantiation
        this._constructing = true;
        constructor.apply(this, arguments);
        delete this._constructing;
      } else if (arguments[0] != null) { // casting
        return (arguments[0].extend || extend).call(arguments[0], proto);
      }
    }
  };
  
  // build the class interface
  klass.ancestor = this;
  klass.extend = this.extend;
  klass.forEach = this.forEach;
  klass.implement = this.implement;
  klass.prototype = proto;
  klass.toString = this.toString;
  klass.valueOf = function(type) {
    //return (type == "object") ? klass : constructor; //-dean
    return (type == "object") ? klass : constructor.valueOf();
  };
  extend.call(klass, _static);
  // class initialisation
  if (typeof klass.init == "function") klass.init();
  return klass;
};

Base.prototype = {  
  extend: function(source, value) {
    if (arguments.length > 1) { // extending with a name/value pair
      var ancestor = this[source];
      if (ancestor && (typeof value == "function") && // overriding a method?
        // the valueOf() comparison is to avoid circular references
        (!ancestor.valueOf || ancestor.valueOf() != value.valueOf()) &&
        /\bbase\b/.test(value)) {
        // get the underlying method
        var method = value.valueOf();
        // override
        value = function() {
          var previous = this.base || Base.prototype.base;
          this.base = ancestor;
          var returnValue = method.apply(this, arguments);
          this.base = previous;
          return returnValue;
        };
        // point to the underlying method
        value.valueOf = function(type) {
          return (type == "object") ? value : method;
        };
        value.toString = Base.toString;
      }
      this[source] = value;
    } else if (source) { // extending with an object literal
      var extend = Base.prototype.extend;
      // if this object has a customised extend method then use it
      if (!Base._prototyping && typeof this != "function") {
        extend = this.extend || extend;
      }
      var proto = {toSource: null};
      // do the "toString" and other methods manually
      var hidden = ["constructor", "toString", "valueOf"];
      // if we are prototyping then include the constructor
      var i = Base._prototyping ? 0 : 1;
      while (key = hidden[i++]) {
        if (source[key] != proto[key]) {
          extend.call(this, key, source[key]);

        }
      }
      // copy each of the source object's properties to this object
      for (var key in source) {
        if (!proto[key]) extend.call(this, key, source[key]);
      }
    }
    return this;
  }
};

// initialise
Base = Base.extend({
  constructor: function() {
    this.extend(arguments[0]);
  }
}, {
  ancestor: Object,
  version: "1.1",
  
  forEach: function(object, block, context) {
    for (var key in object) {
      if (this.prototype[key] === undefined) {
        block.call(context, object[key], key, object);
      }
    }
  },
    
  implement: function() {
    for (var i = 0; i < arguments.length; i++) {
      if (typeof arguments[i] == "function") {
        // if it's a function, call it
        arguments[i](this.prototype);
      } else {
        // add the interface using the extend method
        this.prototype.extend(arguments[i]);
      }
    }
    return this;
  },
  
  toString: function() {
    return String(this.valueOf());
  }
});