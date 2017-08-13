const sqlite3 = require('sqlite3').verbose(),
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

const INSERT_ARTICLES = `\
INSERT INTO articles (\
article_id, \
article_title, \
article_url, \
article_section, \
article_text\
) \
VALUES(?, ?, ?, ?, ?)`;

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

const file = (filename) => new sqlite3.Database(filename);

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

/* String, [Object -> Object] -> Promise */
function selectAllText(db, modifier){
    return new Promise((success, failure) => {
        let rows = [];
        // row -> Array push to rows
        db.each(SELECT_TEXT_AND_DBID, (err, row) => {
            return err ? failure(err) :
                         rows = rows.concat(modifier(row));
        }, (err, num) => {
            return err ? console.error(err) :
                         success(rows);
        });
    });
}

/* String? -> Promise */
function selectRowFromEach(row, param, db){
    return new Promise((success, failure) => {
        let statement = db.prepare;
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

