import {
  Collection,
  Document,
  Filter,
  FindOneAndReplaceOptions,
  FindOptions,
  ObjectId,
  Sort,
} from 'mongodb';
import { RequestHandler } from 'express';

import lib from './lib.js';

export interface Options {
  defaultFilter?: Filter<Document>;
}

class MongoExpressMiddleware {
  collection: Collection;
  options: Options;

  constructor(collection: Collection, options: Options | null) {
    this.collection = collection;
    this.options = options ?? {};
    this.options.defaultFilter = this.options.defaultFilter ?? {};
  }

  find: RequestHandler<
    {},
    {},
    {},
    {
      filter: string | Filter<Document>;
      limit: string | number;
      page: string | number;
      sort: Sort;
      select: Document;
    }
  > = async (req, res) => {
    try {
      const filter = lib.getFilter(
        this.options.defaultFilter,
        req.query.filter
      );
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const page = req.query.page > 0 ? parseInt(req.query.page as string) : 1;
      const findOptions: FindOptions = {
        limit,
        skip: limit * (page - 1),
        sort: lib.getObject<Sort>(req.query.sort),
        projection: lib.getObject<Document>(req.query.select),
      };
      const cursor = await this.collection.find(filter, findOptions);
      const results = await cursor.toArray();
      res.status(200).json(results);
    } catch (e) {
      const message = lib.extractErrorMessage(e);
      res.status(500).json({ message });
    }
  };

  findById: RequestHandler = async (req, res) => {
    try {
      if (!req.params.id) {
        return res.status(400).json({ message: 'Missing id' });
      }
      const filter: Filter<Document> = {
        _id: req.params.id as unknown as ObjectId,
      };
      const isObjectId = req.query.isObjectId ? true : false;
      if (isObjectId) {
        filter._id = new ObjectId(req.params.id);
      }
      const results = await this.collection.findOne(filter, {
        projection: lib.getObject(req.query.select),
      });
      res.status(200).json(results);
    } catch (e) {
      const message = lib.extractErrorMessage(e);
      res.status(500).json({ message });
    }
  };

  count: RequestHandler = async (req, res) => {
    try {
      const filter = lib.getFilter(
        this.options.defaultFilter,
        req.query.filter
      );
      const count = await this.collection.countDocuments(filter);
      res.status(200).json({ count });
    } catch (e) {
      const message = lib.extractErrorMessage(e);
      res.status(500).json({ message });
    }
  };

  create: RequestHandler = async (req, res) => {
    const isObjectId = req.query.isObjectId ? true : false;
    if (Array.isArray(req.body)) {
      const documents = req.body;
      let statusCode = 200;
      const response = {
        insertedCount: documents.length,
        insertedIds: [] as Array<{ _id: ObjectId } | { message: string }>,
      };
      await documents.reduce(async (p, doc) => {
        await p;
        try {
          if (doc._id && isObjectId) {
            doc._id = new ObjectId(doc._id);
          }
          const result = await this.collection.insertOne(doc);
          response.insertedIds.push({ _id: result.insertedId });
        } catch (e) {
          statusCode = 207;
          response.insertedCount -= 1;
          const message = lib.extractErrorMessage(e);
          response.insertedIds.push({ message });
        }
      }, Promise.resolve());

      res.status(statusCode).json(response);
    } else {
      try {
        const doc = req.body;
        if (doc._id && isObjectId) {
          doc._id = new ObjectId(doc._id);
        }
        const result = await this.collection.insertOne(doc);
        res.status(200).json({ _id: result.insertedId });
      } catch (e) {
        const message = lib.extractErrorMessage(e);
        res.status(500).json({ message });
      }
    }
  };

  update: RequestHandler = async (req, res) => {
    if (!req.body || !Object.keys(req.body).length) {
      return res.status(400).json({ message: 'Missing payload' });
    }

    const isObjectId = req.query.isObjectId ? true : false;
    const filter: Filter<Document> = {
      _id: req.params.id as unknown as ObjectId,
    };
    if (isObjectId) {
      filter._id = new ObjectId(req.params.id);
    }
    const isReplace = req.query.replace ? true : false;
    const options: FindOneAndReplaceOptions = {
      upsert: req.query.upsert ? true : false,
    };

    let doc = req.body;
    let result: Document | null = null;
    if (doc._id) {
      delete doc._id;
    }
    if (isReplace) {
      result = await this.collection.findOneAndReplace(filter, doc, options);
    } else {
      doc = {
        $set: doc,
      };
      result = await this.collection.findOneAndUpdate(filter, doc, options);
    }

    if (result.matchedCount == 0) {
      return res.status(404).json({ message: 'Document not found' });
    }
    if (result.modifiedCount == 0) {
      return res.status(304).json({ message: 'Document not modified' });
    }

    res.status(200).json({ _id: req.params.id });
  };

  deleteMany: RequestHandler = async (req, res) => {
    try {
      const filter = lib.getFilter(
        this.options.defaultFilter,
        req.query.filter
      );
      await this.collection.deleteMany(filter);
      res.end();
    } catch (e) {
      const message = lib.extractErrorMessage(e);
      res.status(500).json({ message });
    }
  };

  deleteById: RequestHandler = async (req, res) => {
    try {
      if (!req.params.id) {
        return res.status(400).json({ message: 'Missing id' });
      }
      const filter: Filter<Document> = {
        _id: req.params.id as unknown as ObjectId,
      };
      const isObjectId = req.query.isObjectId ? true : false;
      if (isObjectId) {
        filter._id = new ObjectId(req.params.id);
      }
      await this.collection.deleteOne(filter);
      res.end();
    } catch (e) {
      const message = lib.extractErrorMessage(e);
      res.status(500).json({ message });
    }
  };

  aggregate: RequestHandler = async (req, res) => {
    try {
      const pipeline: Array<Document> = req.body;
      const cursor = await this.collection.aggregate(pipeline);
      const aggregateResult = await cursor.toArray();
      res.status(200).json(aggregateResult);
    } catch (e) {
      const message = lib.extractErrorMessage(e);
      res.status(500).json({ message });
    }
  };
}

export default MongoExpressMiddleware;
module.exports = MongoExpressMiddleware;
