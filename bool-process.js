/* Array, Array -> Array
    assumes both arrays are sorted
    - could take an additional arg:
        - AND, OR, NOT...
        allow for more complex queries  */
function intersect(arr1, arr2){
    var result = [];
    var a1 = arr1;
    var a2 = arr2;

    while(a1.length !== 0 && a2.length !== 0){
        if(a1[0] === a2[0]){
            result.push(a1[0]);
            a1 = a1.slice(1);
            a2 = a2.slice(1);
        } else if(a1[0] < a2[0]){
            a1 = a1.slice(1);
        } else {
            a2 = a2.slice(1);
        }
    }
    
    return result;
}

/* Array -> Array
    
    returns array ids that are present in all given langs  */
function multipleIntersect2(langs, data){
    /* sorts langs by array size
       starting with smallest arrays means 
       intermediate results will be no bigger
       than smallest array */
    var sorted = langs.map((lang) => {
        return data[lang].ids;
    }).sort((a, b) => {
        return a - b;
    });
    
    // first
    var result = sorted[0];
    // rest
    var sorted = sorted.slice(1);
    
    while(sorted.length !== 0 && result.length !== 0){
        // intersect first & second - smallest arrays
        result = intersect(result, sorted[0]);
        sorted = sorted.slice(1);
    }
    
    return result;
}

/* Inverted Index, ...String -> Array-of-Number */
function multipleIntersect(index, ...terms){
    const terms = terms.sort((a, b) => index[a].length < index[b].length);
    const result = index[terms[0]];
    terms = terms.slice(1);
    
    while(terms.length !== 0 && result.length !== 0){
        result = multipleIntersect(result, index[terms[0]]);
        terms = terms.slice(1);
    }
    
    return result;
}   


module.exports = {
    intersect: intersect,
    multipleIntersect: multipleIntersect
}
