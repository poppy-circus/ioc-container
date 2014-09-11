ioc-container
=============

A prototype based solution to perform Dependency Injection concepts in javascript.
This one goes out for all singleton denier.

## grunt tasks

~~~bash
# api docs
grunt jsdoc
~~~

~~~bash
# code coverage
grunt coverage-report
~~~

## idea

It takes the prototype of a class - `origin` - and can create multiple prototypes with
modifications - `reflections` - of it. The reflections are controlled by a `scope`
identifier and became applied to a class. When instantiating a class and calling a
method, the reflection is targeted by the scope and became executed.

It is possible to inject properties and methods on classes (and instances of classes).
On instances, the prototpye of class is used for further injections. Properties are
not cloned. Runtime modifications on an array or a literal, will affect all prototypes
sharing the same property reference. Methods got access to the origin prototype,
to allow polymorphism.

~~~js
var Klass = function(){};
Klass.prototype.fn = function(){ return 'default-' + this.prop; };
Klass.prototype.prop = 'foo';

var inst_ioc, inst = new Klass();
var ioc = new IoCContainer();
ioc
  .switchScope('myScope') //create a new scope
  .inject(Klass, { //injections
    fn: function() { return 'injected-' + this.prop; },
      prop: 'bar'
    }})
  .synthesize(); //switch to myScope reflection

inst_ioc = new Klass();
console.log(inst.fn()); //returns 'default-foo'
console.log(inst_ioc.fn()); //returns 'inejected-bar'

ioc.dispose(); //remove reflections
console.log(new Klass().fn()); //returns 'default-foo'
~~~
