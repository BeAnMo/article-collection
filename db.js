const sqlite3 = require('sqlite3').verbose(),
      Bottleneck = require('bottleneck'),
      assert = require('assert');


const CREATE_ARTICLES = `\
CREATE TABLE IF NOT EXISTS articles (\
db_id INTEGER PRIMARY KEY AUTOINCREMENT, \
article_id TEXT, \
article_title TEXT, \
article_url TEXT, \
article_section TEXT, \
article_text TEXT, \
CONSTRAINT uniq_article UNIQUE (article_id, article_title)\
)`;

const CREATE_INV_INDEXES = `\
CREATE TABLE IF NOT EXISTS inv_indexes (\
word, article_id_list\
)`;

const INSERT_ARTICLES = `\
INSERT INTO articles (\
article_id, \
article_title, \
article_url, \
article_section, \
article_text\
) \
VALUES(?, ?, ?, ?, ?)`;

const INSERT_INV_INDEXES =`\
INSERT INTO inv_indexes (\
word, article_id_list\
) \
VALUES(?, ?)`;

const SELECT_ARTICLE_BY_ID = `\
SELECT \
db_id, \
article_id, \
article_title, \
article_url, \
article_section, \
article_text \
FROM articles \
WHERE article_id=?\
`;

const SELECT_TEXT_AND_DBID = `\
SELECT \
db_id, \
article_text \
FROM articles \
`;

const SELECT_TEXT_AND_DBID_WHERE = `\
SELECT \
db_id, \
article_text \
FROM articles \
WHERE db_id=?\
`;

const file = (filename) => new sqlite3.Database(filename);
const DELAY = 1000;
const LIMITER = new Bottleneck(1, DELAY, -1, Bottleneck.strategy.BLOCK);

/* Database -> Promise*/
function init(db){
    return new Promise((success, failure) => {
        return db.run('PRAGMA foreign_keys = ON')
                 .run(CREATE_ARTICLES, result('CREATE_TABLE', success, failure));
    });
}

/* Array -> Void */
function insertArticles(articles, db){
    const assertArray = assert.strictEqual(Array.isArray(articles), true);
   
    return db.serialize(() => {
        db.run('BEGIN');
        
        const statement = db.prepare(INSERT_ARTICLES);
    
        articles.forEach((article) => {
            let params = [
                article.id,
                article.webTitle,
                article.webUrl,
                article.sectionName,
                article.bodyTextSummary
            ];
            
            statement.run(params, result('insertArticles forEach'));
        });
        
        statement.finalize(() => {
            db.run('COMMIT');
            console.log('All articles inserted');
        });
    });
}

/* String -> Promise */
function retrieveArticle(article_id, db){
    return new Promise((success, failure) => {
        db.get(SELECT_ARTICLE_BY_ID, article_id, (err, row) => {
            return err ? failure(err) :
                         success(row);
        });
    });
}

/* String, String, Database -> Promise */
function selectRow(query, selector, db){
    return new Promise((success, failure) => {
        db.get(query, selector, (err, row) => {
            return err ? failure(err) :
                         success(row);
        });
    });
}

/* Database, Function -> Void 
    Selects all article text from the DB,
    the function is assumed to be a tokenizer */
function selectAllText(db){
    let statement = db.prepare(SELECT_TEXT_AND_DBID_WHERE)
    
    function getRow(id){
        return new Promise((success, failure) => {
            statement.get(id, (err, row) => {
                if(err){
                    return failure(err)
                } else if(row === undefined){
                    return success(false)
                } else {
                    return success(row)
                }
            })
        })
    }
    
    function* iterRow(){
        let id = 0
        
        while(id < 9000){ // how to account for varying length?
            yield LIMITER.schedule(getRow, id)
            id++
        }    
    }
    
    function getAllRows(iter){        
        for(let value of iter){
            value
                .then((row) => console.log(row.db_id)) // call modifier here on row.article_text
                .catch(console.error)
        }
    }
    
    return getAllRows(iterRow())
}


/* String? -> Promise */
function selectRowFromEach(err, row){
    return new Promise((success, failure) => {
        if(err){
            return failure(err);
            
        } else if(row.article_text === null){
            return;
            
        } else {
            return success(row.db_id);
            //return rows = rows.concat(modifier(row));
        }
    });
}

/* String, Function, Function -> [Error, Object -> Error or [Object -> X]]
    passed as error callback for async operations
    allows logging of error location
    success/failure callbacks optional  */
function result(location, success, failure){
    return function(err, obj){
        if(err) {
            if(failure){
                return failure(new Error(`${location}: ${err}`));
            } else {
                return console.log(`${location}: ${err}`);
            }
        } else if(success){
            return success(obj);
        } else {
            return;
        }
    }
}


module.exports = {
    file: file,
    init: init,
    insertArticles: insertArticles,
    retrieveArticle: retrieveArticle,
    selectAllText: selectAllText
};

