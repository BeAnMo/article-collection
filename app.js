#!/usr/bin/env node
const fs = require('fs'),
      https = require('https'),
      Bottleneck = require('bottleneck'),
      db = require('./db'),
      KEYS = require('./keys'),
      jsf = require('./json-find');
 
/*
1. make first request
    - get results data (articles & ids) and add to store
    - get number of pages
2. make rest requests based on number of pages
    - get results, add to store
3. write files (article & id stores) to json
4. exit
*/
'use strict';
const DB = db.file('./storage/articles.db');
const DELAY = 500;
const LIMITER = new Bottleneck(4, DELAY);

console.time('Article collection');

/* String -> Promise [[Object -> X], [Error -> X] -> X] */
function getAPI(url){
    return new Promise((success, fail) => {
        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                let results = JSON.parse(data).response;
                
                return success(results);
            });
        }).on('error', (err) => {
        
            return fail(err);
        });
    });
}

/* Object -> Object */
function collectArticleData(result){
    let article = Object.assign({}, { id: jsf.checkKey(result.blocks.body, 'id') });
    Object.assign(article, jsf.findValues(result, 'webUrl', 'webTitle', 'sectionName', 
                                                                        'bodyTextSummary'));
    
    return article;
}

/* Array -> Array 
    The data for articles are written to JSON for each page
    to prevent a Node core dump from running out of heap memory.
    Only the array of ids is passed through the program.
    The first id collected on a page is the name of the articles .json
    and *-ids.json.  */
function collectAllArticles(results){
    let data = [];
    let ids = [];
    let len = results.length;
    
    for(let i = 0; i < len; i++){
        try{ // does another type of ID need to be used? 
             // main ID is uri path, probably unsuitable for filename
            ids.push(jsf.checkKey(results[i].blocks.body, 'id'));
            data.push(collectArticleData(results[i]));
        } catch(e){
            console.error('collectAllArticles for loop');
        }
    }
    
    // better way to handle this? pretty slow
    // rest of program finished well before this
    // even BEGIN/COMMIT don't speed the process up
    
    // forget i said anything... keep everything between BEGIN/COMMIT -
    // serialize -> BEGIN -> prepare statement -> run statement -> finalize statement -> COMMIT
    db.insertArticles(data, DB);
    
    return ids;
}

/* Object -> Object */
function getFirstPageData(res){
    console.log('pages ', res.pages);
    console.log('page number: 1');
    return {
        pages: res.pages,
        ids: collectAllArticles(res.results)
    }
}

/* Object -> Array */
function getRestPagesData(firstData){
    let len = firstData.pages;
    let proms = [];
    
    proms.push(firstData.ids);
    
    for(let i = 2; i <= 200; i++){
        let prom = LIMITER.schedule(getAPI, guardianURL(i))
            .then((res) => {
                console.log('page number: ', i);
                return collectAllArticles(res.results);
            });

        proms.push(prom);
    }
    
    // already resolved? need Promise.all?
    return Promise.all(proms);
}

/* Array-of-Promises -> Void */
function writePagesData(proms){
    console.log('Download concluded');
    let ids = proms.reduce((acc, curr) => {
        return acc.concat(curr);
    });
                       
    return writeJSON(`./storage/ids-${ids[0]}.json`, ids);

}

/* String -> Promise */
function delay_get(pageNum){ // UNEEDED
    return setDelay(getAPI(guardianURL(pageNum)));
}

/* Number -> String */
function guardianURL(page){
    let key = KEYS.guardian;
    let base = 'https://content.guardianapis.com/search?';
    let params = `page=${page}&page-size=50&show-blocks=all&api-key=${key}`;
    
    return base + params;
};

/* X -> [X -> X ]*/
function setDelay(op){ // UNEEDED
    return new Promise((success, fail) => {
        setTimeout(() => {
            success(op)
        }, DELAY);
    });
}

/* String, Object -> Void */
function writeJSON(name, obj){
    return fs.writeFile(name, JSON.stringify(obj), 'utf-8', (err) => {
        return err ? new Error('writeJSON:', err) :
                     console.log(`wrote to JSON: ${name}`);
    });
}

function main(){
    db.init(DB) // Database -> Void
        .then(() => {
            getAPI(guardianURL(1)) // Number -> Object
                .then(getFirstPageData) // Object -> Object
                .then(getRestPagesData) // Object -> Array
                .then((proms) => {
                    console.timeEnd('Article collection');
                    return writePagesData(proms);
                }) // Array -> Void
                .catch(console.error);
        })
        .catch(console.error);
}

main();
