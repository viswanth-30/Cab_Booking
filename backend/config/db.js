const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let dbMode = 'mongo'; // 'mongo' or 'mock'
const mockDbPath = path.join(__dirname, '../mock_db.json');

// Initialize empty mock DB file if it doesn't exist
if (!fs.existsSync(mockDbPath)) {
  fs.writeFileSync(mockDbPath, JSON.stringify({
    users: [],
    rides: [],
    payments: [],
    supports: []
  }, null, 2));
}

// Helper to read/write mock database
const readMockDb = () => {
  try {
    return JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
  } catch (err) {
    return { users: [], rides: [], payments: [], supports: [] };
  }
};

const writeMockDb = (data) => {
  fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2));
};

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ucab', {
      serverSelectionTimeoutMS: 2000 // Quick timeout to fallback fast
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    dbMode = 'mongo';
  } catch (error) {
    console.warn(`\n⚠️ MongoDB connection failed: ${error.message}`);
    console.warn(`⚠️ Falling back to Local JSON Database Mock (mock_db.json)\n`);
    dbMode = 'mock';
  }
};

// Custom Mock Mongoose Model
class MockModel {
  constructor(modelName) {
    this.modelName = modelName;
    this.collectionName = modelName.toLowerCase() + 's';
  }

  // Helper to get collections
  _getCollection() {
    const db = readMockDb();
    return db[this.collectionName] || [];
  }

  _saveCollection(collection) {
    const db = readMockDb();
    db[this.collectionName] = collection;
    writeMockDb(db);
  }

  // Simple query matching helper
  _match(doc, query) {
    if (!query) return true;
    for (let key in query) {
      let val = query[key];

      // Handle $or operator
      if (key === '$or') {
        const orArray = query[key];
        const matchOr = orArray.some(subQuery => this._match(doc, subQuery));
        if (!matchOr) return false;
        continue;
      }

      // Handle object queries like { $in: [...] }
      if (val && typeof val === 'object' && val !== null) {
        if ('$in' in val) {
          const inArray = val.$in.map(v => v?.toString());
          const docValStr = doc[key]?.toString();
          if (!inArray.includes(docValStr)) return false;
          continue;
        }
      }

      // Default direct match comparison
      let docVal = doc[key];
      if (docVal && typeof docVal === 'object' && docVal.toString && typeof val === 'string') {
        docVal = docVal.toString();
      }
      if (val && typeof val === 'object' && val.toString) {
        val = val.toString();
      }

      if (docVal !== val) return false;
    }
    return true;
  }

  // Mock document instantiator to allow calling doc.save()
  _instantiateDoc(doc) {
    if (!doc) return null;
    const modelInstance = this;
    return {
      ...doc,
      save: async function() {
        const collection = modelInstance._getCollection();
        const index = collection.findIndex(item => item._id === this._id);
        this.updatedAt = new Date().toISOString();
        if (index !== -1) {
          collection[index] = { ...this };
        } else {
          collection.push({ ...this });
        }
        modelInstance._saveCollection(collection);
        return this;
      }
    };
  }

  // Chainable Query Builder class to mimic Mongoose thenable query
  _createQuery(data) {
    const self = this;
    const queryObj = {
      _data: data,
      _populates: [],
      
      populate(pathStr) {
        this._populates.push(pathStr);
        return this;
      },
      sort(criteria) {
        // Simple sorting if needed
        return this;
      },
      select(fields) {
        return this;
      },
      limit(n) {
        if (Array.isArray(this._data)) {
          this._data = this._data.slice(0, n);
        }
        return this;
      },
      // Make it thenable so await works directly
      then(onResolve, onReject) {
        // Resolve populates before returning
        const db = readMockDb();
        let result = this._data;

        const populateItem = (item, path) => {
          if (!item || !item[path]) return;
          const refId = item[path].toString();
          // Decide which collection to populate based on field name
          let refCol = null;
          if (path === 'user' || path === 'driver') refCol = db.users;
          if (path === 'ride') refCol = db.rides;
          if (path === 'payment') refCol = db.payments;

          if (refCol) {
            const foundRef = refCol.find(r => r._id === refId);
            if (foundRef) {
              const cleanedRef = { ...foundRef };
              delete cleanedRef.password; // Exclude password from populated data
              item[path] = cleanedRef;
            }
          }
        };

        if (Array.isArray(result)) {
          result = result.map(item => {
            const instantiated = self._instantiateDoc(item);
            this._populates.forEach(p => populateItem(instantiated, p));
            return instantiated;
          });
        } else if (result) {
          result = self._instantiateDoc(result);
          this._populates.forEach(p => populateItem(result, p));
        }

        return Promise.resolve(result).then(onResolve, onReject);
      }
    };
    return queryObj;
  }

  find(query = {}) {
    const list = this._getCollection().filter(doc => this._match(doc, query));
    return this._createQuery(list);
  }

  findOne(query = {}) {
    const item = this._getCollection().find(doc => this._match(doc, query));
    return this._createQuery(item || null);
  }

  findById(id) {
    if (!id) return this._createQuery(null);
    const item = this._getCollection().find(doc => doc._id === id.toString());
    return this._createQuery(item || null);
  }

  async create(data) {
    const collection = this._getCollection();
    const newDoc = {
      _id: Math.random().toString(36).substring(2, 11),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    collection.push(newDoc);
    this._saveCollection(collection);
    return this._instantiateDoc(newDoc);
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const collection = this._getCollection();
    const index = collection.findIndex(doc => doc._id === id.toString());
    if (index === -1) return null;

    let doc = collection[index];
    // Check if there is a $set or if it's direct fields
    const fieldsToUpdate = update.$set ? update.$set : update;
    for (let key in fieldsToUpdate) {
      doc[key] = fieldsToUpdate[key];
    }
    doc.updatedAt = new Date().toISOString();
    collection[index] = doc;
    this._saveCollection(collection);
    return this._instantiateDoc(doc);
  }

  async deleteMany(query = {}) {
    const collection = this._getCollection();
    const remaining = collection.filter(doc => !this._match(doc, query));
    this._saveCollection(remaining);
    return { deletedCount: collection.length - remaining.length };
  }

  async deleteOne(query = {}) {
    const collection = this._getCollection();
    const index = collection.findIndex(doc => this._match(doc, query));
    if (index !== -1) {
      collection.splice(index, 1);
      this._saveCollection(collection);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async countDocuments(query = {}) {
    return this._getCollection().filter(doc => this._match(doc, query)).length;
  }
}

// Function to dynamically load Mongoose or Mock Model using dynamic Proxy
const getModel = (name, schema) => {
  let mongooseModel;
  let mockModel;

  const getActiveModel = () => {
    if (dbMode === 'mock') {
      if (!mockModel) mockModel = new MockModel(name);
      return mockModel;
    } else {
      if (!mongooseModel) {
        try {
          mongooseModel = mongoose.model(name);
        } catch (error) {
          mongooseModel = mongoose.model(name, schema);
        }
      }
      return mongooseModel;
    }
  };

  return new Proxy({}, {
    get(target, prop, receiver) {
      const activeModel = getActiveModel();
      const value = Reflect.get(activeModel, prop);
      if (typeof value === 'function') {
        return value.bind(activeModel);
      }
      return value;
    },
    construct(target, argumentsList, newTarget) {
      const activeModel = getActiveModel();
      return Reflect.construct(activeModel, argumentsList, newTarget);
    }
  });
};

module.exports = {
  connectDB,
  getModel,
  isMock: () => dbMode === 'mock'
};
