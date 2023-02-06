# mongo-express-middleware

Express middleware that will give you CRUD APIs on top of any MongoDB collection

# Usage

```js
const { MongoClient } = require("mongodb");
const express = require('express');
const app = express();

const MongoExpressMiddleware = require('mongo-express-middleware');

const uri = "mongodb://localhost:27017";

const client = new MongoClient(uri);
const database = client.db('test');
const testCollection = database.collection('users');

const crud = new MongoExpressMiddleware(testCollection, null);

console.log(new Date());

app.use(express.json());

app.get('/', crud.find);
app.get('/:id', crud.findById);
app.get('/utils/count', crud.count);
app.post('/', crud.create);
app.put('/:id', crud.update);
app.delete('/', crud.deleteMany);
app.delete('/:id', crud.deleteById);


app.listen(3000, () => {
	console.log('Example app listening on port 3000!');
});
```

- [mongo-express-middleware](#mongo-express-middleware)
- [Usage](#usage)
- [Install](#install)
- [Documentation](#documentation)
	- [find(req, res)](#findreq-res)
		- [Response](#response)
		- [How `page` param works](#how-page-param-works)
	- [findById(req, res)](#findbyidreq-res)
		- [Response](#response-1)
		- [Why `isObjectId` ?](#why-isobjectid-)
	- [count(req, res)](#countreq-res)
		- [Response](#response-2)
	- [create(req, res)](#createreq-res)
		- [Response](#response-3)
	- [update(req, res)](#updatereq-res)
		- [Response](#response-4)
	- [deleteMany(req, res)](#deletemanyreq-res)
	- [deleteById(req, res)](#deletebyidreq-res)

# Install

```sh
npm i @jerrymannel/mongo-express-middleware
```

# Documentation

## find(req, res)

Query a collection with a given `filter`, which is send as URL params. This simulates the Mongodb [find](https://www.mongodb.com/docs/v6.0/reference/command/find/) operation.

| Query | Type | Description | e.g. |
|--|--|--|--|
| filter | `Object` | Apply a filter for retrieving data. Accepts any valid MongoDB filter expression. | `{"buying_price": {"$ne": 100}}` |
| select | `Object` | Select the attributes you want to retrieve. If `select` is not set, then the whole document is retrieved. Accepts any valid MOngoDB projection expression | `{"amount":1, "units":1, "name":1}` |
| sort | `Object` | Sorts the data. Accepts MongoDB sort syntax | `{"name":-1}` |
| limit | `Number` | The maximum number of documents to return. If unspecified, then defaults to 10 | 
| page | `Number` | Page based on the limit specified.  | 

### Response

Returns an array of JSONs or an empty array

> Filter and select expressions are similar to MongoDB [Query and Projection Operators
](https://www.mongodb.com/docs/manual/reference/operator/query/).

### How `page` param works

Page param for `find(req, res)` works together with `filter`, `limit`, and total document count.

Let's assume that the total number of documents in the collection is 10 and your `filter` condition doesn't change between API calls, then
* Setting `limit=5` and `page=1` fetched the first 5 documents.
* Setting `limit=5` and `page=2` fetched the next 5 documents. etc

## findById(req, res)

Query the collection and find the document with the `_id` that matches `req.params.id`

| Query | Type | Default | Description |
|--|--|--|--|
| `isObjectId` | `Boolean` | `false` | If `isObjectId` is set then we find the document where `_id` is of type [ObjectId](https://www.mongodb.com/docs/v6.0/reference/method/ObjectId/) |

### Response
Returns a single JSON.

### Why `isObjectId` ?

You can create two documents in MongoDB with the same `_id` where one is of type `string` and the other of type `ObjectId`.

When you create a document using the [create(req, res)](#createreq-res), you can set the `_id` of the document. If the `isObjectId` param is not set for `create` then the user-specified `_id` is set as type string.

Hence, I have made provision under `findById(req, res)` to query documents where `_id` can be of either type.


## count(req, res)

Count the number of documents under the collection that matches the specified `filter` param. If `filter` is not set then this returns the total number of documents.

| Query | Type | Description | e.g. |
|--|--|--|--|
| filter | `Object` | Apply a filter for retrieving data. Accepts any valid MongoDB filter expression. | `{"buying_price": {"$ne": 100}}` |

### Response
Returns a non negative interger value.

## create(req, res)

Input - Single JSON or an Array of JSONs

Creates a single or multiple documents when an array of JSONs are passed.

| Query | Type | Default | Description |
|--|--|--|--|
| `isObjectId` | `Boolean` | `false` | If `isObjectId` is set then we parse the `_id` of the document, if present, as type [ObjectId](https://www.mongodb.com/docs/v6.0/reference/method/ObjectId/) |

### Response

If a single JSON is given as input then, the response is a JSON document with only the `_id` of the document that was created.

If an array of JSONs are given as input then, 
  * HTTP `200 OK` if all the documents where inserted successfully.
  * HTTP `207` if someof the documents got inserted.

Response will be a JSON that gives you the `insertedCount` and the `insertedIds`. The documents in the `insertedIds` will either have the `_id` or the error at the same index as the input array.
e.g.

```json
{
  "insertedCount": 3,
  "insertedIds": [
    {
      "_id": "63deca5b04463760d5bb7bed"
    },
    {
      "_id": "63deca5b04463760d5bb7bee"
    },
    {
      "_id": "63deca5b04463760d5bb7bef"
    }
  ]
}
```

## update(req, res)

Update/replace/upserts a document with the `_id` that matches `req.params.id`

| Query | Type | Default | Description |
|--|--|--|--|
| `isObjectId` | `Boolean` | `false` | If `isObjectId` is set then we find the document where `_id` is of type [ObjectId](https://www.mongodb.com/docs/v6.0/reference/method/ObjectId/) |
| `isReplace` | `Boolean` | `false` | Replace the existing document in the collection with the document in the payload |
| `upsert` | `Boolean` | `false` | Update the document is present, else create a new document. Read more about `upsert` [here](https://www.mongodb.com/docs/v6.0/reference/method/db.collection.update/#std-label-update-upsert). |

### Response

JSON that has the `_id` of the document that was updated/replaced/upserted.


## deleteMany(req, res)

Deletes multiple documents that matches the `filter` query.

Accepts `filter` as a query param. Refer `filter` documentation under [find](#findreq-res)

## deleteById(req, res)

Deletes a single document with the `_id` that matches `req.params.id`.

Accepts `isObjectId` as a query param. Refer `isObjectId` documentation under [findById](#findbyidreq-res)