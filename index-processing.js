const db = require('./db'),
      bool = require('./bool-process'),
      Index = require('./inverse-index'),
      assert = require('assert'),
      nlp = require('natural');

/* building an inverted index:
1. collect documents
2. tokenize - each document is a list of tokens
3. linguistic preprocessing? produces a list of 'normalized' tokens
4. index the documents that each term occurs in

Article:
- article_title: String
- db_id: Number
- article_id: String
- article_section: String
- article_text: String

Posting Sequence:
- { id: Number, word: String }

Inverted Index:
- [PostingSequence term]: Array-of-db_id

1. pull article from DB
2. create Inverted Index from article and add to Object
*/

const DB = db.file('./storage/articles.db');
// test objects

exports.bool = bool;

// runs out of heap memory when trying to create a Posting Sequence from
// every entry in the DB
exports.main = function(arr){
    return db.init(DB)
        // Database, Rows -> Array-of-PostSequence
        .then(() => {
            return db.selectAllText(DB, createSeq);
        })
        // Array-of-PostSequence -> Index
        .then((rows) => {
            assert.strictEqual(Array.isArray(rows), true);
            
            return createIndex(rows);
        })
        .then((index) => {
            assert.strictEqual(index instanceof Index, true);
            
            arr.push(index);
        })
        .catch(console.error);
}

/* Array-of-PostingSequence -> Index */
function createIndex(seq){
    let index = new Index();

    seq.forEach((s) => {
        let word = s.word;
        
        if(index.checkKey(s.word) && index.checkValue(s.word, s.id)){
            let clone = index[word].slice(0);
            
            index.setStore(word, clone);
            
        } else {
            index.setStore(word, [s.id]);
        }
    });
    
    return index;
}

/* Array-of-Article -> Array-of-PostingSequence */
function createSeq(row){
    const tokenMaker = new nlp.WordTokenizer();
    let tokens = tokenMaker.tokenize(row.article_text);
    // good god...time complexity?
    return mergeSort(tokens).map((token) => {
        return { id: row.db_id, word: token };
    });
}

/* Array-of-String, Number -> Array-of-PostingSequence */
function mergeSort(arr){
    function divide(arr){
        if(arr.length < 2){
            return arr;
        }
        
        var mid = parseInt(arr.length / 2);
        var left = arr.slice(0, mid);
        var right = arr.slice(mid, arr.length);
        
        return combine(divide(left), divide(right));
    }

    function combine(left, right){
        var result = [];
        
        while(left.length && right.length){
            if(left[0] <= right[0]){
                result.push(left.shift());
            } else {
                result.push(right.shift());
            }
        }
        
        while(left.length){
            result.push(left.shift());
        }
        
        while(right.length){
            result.push(right.shift());
        }
        
        return result;
    }
    
    return divide(arr);
}


/* Array -> Array */
function alphabeticalSort(arr){
    let clone = arr.slice(0);
    
    return clone.sort((a, b) => {
        if(a.term < b.term){ 
            return -1; 
        } else if(a.term > b.term){ 
            return 1; 
        } else { 
            return 0;
        }
    });
}

