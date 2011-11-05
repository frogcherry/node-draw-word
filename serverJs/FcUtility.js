/**
 * fc公共工具
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.02
 */
FcUtility = exports;

Object.prototype.Clone = function(){  
    var objClone;  
    if (this.constructor == Object){  
        objClone = new this.constructor();   
    }else{  
        objClone = new this.constructor(this.valueOf());   
    }  
    for(var key in this){  
        if ( objClone[key] != this[key] ){   
            if ( typeof(this[key]) == 'object' ){   
                objClone[key] = this[key].Clone();  
            }else{  
                objClone[key] = this[key];  
            }  
        }  
    }  
    objClone.toString = this.toString;  
    objClone.valueOf = this.valueOf;  
    return objClone;   
};

function clone(myObj)
{  
    if(typeof(myObj) != 'object') return myObj;  
    if(myObj == null) return myObj;  
    var myNewObj = new Object();   
    for(var i in myObj) myNewObj[i] = clone(myObj[i]);   
    return myNewObj;  
}

FcUtility.clone = clone;
