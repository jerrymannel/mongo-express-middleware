"use strict"
const { ObjectId } = require("mongodb");
const _ = require("lodash");

const lib = require("./lib.js");

async function find(req, res) {
	try {
		let filter = lib.getFilter(this.options.defaultFilter, req.query.filter);
		let findOptions = {
			limit: req.query.limit ? parseInt(req.query.limit) : 10,
		};
		let page = req.query.page > 0 ? parseInt(req.query.page) : 1;
		findOptions.skip = findOptions.limit * (page - 1);
		findOptions.sort = lib.getObject(req.query.sort);
		findOptions.projection = lib.getObject(req.query.select);
		let cursor = await this.collection.find(filter, findOptions);
		let results = await cursor.toArray();
		res.status(200).json(results);
	} catch (e) {
		res.status(500).json({ message: e.message });
	}
};

async function findById(req, res) {
	try {
		if (!req.params.id) return res.status(400).json({ message: "Missing id" });
		let filter = {
			"_id": req.params.id
		};
		let isObjectId = req.query.isObjectId ? true : false;
		if (isObjectId) filter._id = new ObjectId(req.params.id);
		let results = await this.collection.findOne(filter, {
			projection: lib.getObject(req.query.select)
		});
		res.status(200).json(results);
	} catch (e) {
		res.status(500).json({ message: e.message })
	}
}

async function count(req, res) {
	try {
		let filter = lib.getFilter(this.options.defaultFilter, req.query.filter);
		let documentCount = await this.collection.countDocuments(filter);
		res.status(200).json({ count: documentCount });
	} catch (e) {
		res.status(500).json({ message: e.message })
	}
};

async function create(req, res) {
	let isObjectId = req.query.isObjectId ? true : false;
	if (_.isArray(req.body)) {
		let documents = req.body;
		let statusCode = 200;
		let response = {
			insertedCount: documents.length,
			insertedIds: []
		};
		await documents.reduce(async (p, doc) => {
			await p;
			try {
				if (doc._id && isObjectId) {
					doc._id = new ObjectId(doc._id);
				}
				let result = await this.collection.insertOne(doc);
				response.insertedIds.push({ _id: result.insertedId });
			} catch (e) {
				statusCode = 207;
				response.insertedCount -= 1;
				response.insertedIds.push({ message: e.message });
			}
		}, Promise.resolve());

		res.status(statusCode).json(response);
	}
	else {
		try {
			let doc = req.body;
			if (doc._id && isObjectId) {
				doc._id = new ObjectId(doc._id);
			}
			let result = await this.collection.insertOne(doc);
			res.status(200).json({ _id: result.insertedId })
		} catch (e) {
			res.status(500).json({ message: e.message })
		}
	}
};

async function update(req, res) {
	if (!req.body || req.body == {}) return res.status(400).json({ message: "Missing payload" });
	let isObjectId = req.query.isObjectId ? true : false;
	let isReplace = req.query.replace ? true : false;
	const options = {
		upsert: req.query.upsert ? true : false
	};
	if(Array.isArray(req.body) &&  req.params.id) return res.status(400).json({err_request:"For single update pass id in url param with payload object and for multiple updates pass only payload object array with ids inside the payload"})
	
	if(Array.isArray(req.body)){
		let idMissing = [];
		let updateData = [];
		req.body.forEach(eachBody => {
			if(!eachBody._id){
				idMissing.push(eachBody);
				return;
			}
			let id = eachBody._id;
			let updates = eachBody;
			delete updates._id;
			
			if (isObjectId) id = new ObjectId(id);

			if (isReplace) {
				updateData.push( { replaceOne: {
					filter: { _id:  id},
					replacement: {  ...updates }
				 } });
			}else{
				updateData.push( { updateOne: {
					filter: { _id:  id},
					update: { $set: updates }
				 } });
			}
		});
		
		if(updateData.length == 0) return res.status(404).json({ message: "_id is mandatory for updating" });
		
		let result = await this.collection.bulkWrite(updateData);
		if (idMissing.length > 0) result.missing_id = idMissing;

		res.status(200).json(result);

	}else{

		let filter = {
			"_id": req.params.id
		}
		if (isObjectId) filter._id = new ObjectId(req.params.id);

		let doc = req.body;
		let result = null;
		if (doc._id) delete doc._id;
		if (isReplace) {
			result = await this.collection.findOneAndReplace(filter, doc, options);
		} else {
			doc = {
				"$set": doc
			}
			result = await this.collection.findOneAndUpdate(filter, doc, options);
		}


		if (result.matchedCount == 0) return res.status(404).json({ message: "Document not found" });
		if (result.modifiedCount == 0) return res.status(304).json({ message: "Document not modified" });

		res.status(200).json({ _id: req.params.id });
	}

}

async function deleteMany(req, res) {
	try {
		let filter = lib.getFilter(this.options.defaultFilter, req.query.filter);
		await this.collection.deleteMany(filter);
		res.end()
	} catch (e) {
		res.status(500).json({ message: e.message })
	}
};

async function deleteById(req, res) {
	try {
		if (!req.params.id) return res.status(400).json({ message: "Missing id" });
		let filter = {
			"_id": req.params.id
		}
		let isObjectId = req.query.isObjectId ? true : false;
		if (isObjectId) filter._id = new ObjectId(req.params.id);
		await this.collection.deleteOne(filter);
		res.end();
	} catch (e) {
		res.status(500).json({ message: e.message })
	}
}

async function aggregate(req, res) {
	try {
		let pipeline = req.body;
		let cursor = await this.collection.aggregate(pipeline);
		let aggregateResult = await cursor.toArray();
		res.status(200).json(aggregateResult)
	} catch (e) {
		res.status(500).json({ message: e.message })
	}
}

let mongoCrud = function (collection, options) {
	this.collection = collection;
	this.options = options ? options : {};
	this.options.defaultFilter = this.options.defaultFilter ? this.options.defaultFilter : {};

	this.find = find.bind(this);
	this.findById = findById.bind(this);
	this.count = count.bind(this);
	this.create = create.bind(this);
	this.update = update.bind(this);
	this.deleteById = deleteById.bind(this);
	this.deleteMany = deleteMany.bind(this);
	this.aggregate = aggregate.bind(this);
}

mongoCrud.prototype = {
	constructor: mongoCrud,
	collection: null,
	options: null,
}

module.exports = mongoCrud