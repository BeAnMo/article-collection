function Index(){
    this.store = {};
}

Index.prototype.setStore = function(str, arr){
    return Object.assign(this.store, { [str]: arr });
}

Index.prototype.checkKey = function(key){
    return this.store.hasOwnProperty(key);
}

Index.prototype.checkValue = function(key, id){
    return this.store[key].index(id) === -1;
}

module.exports = Index;

