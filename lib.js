"use strict"
const _ = require("lodash");

let lib = {}

lib.getFilter = (_default, _filter) => {
	let defaultFilter = _default ? _default : {};
	let filter = _filter ? _filter : {};
	if (typeof filter === "string") {
		try {
			filter = JSON.parse(filter);
			filter = this.FilterParse(filter);
		} catch (err) {
			filter = {};
		}
	}
	return _.assign({}, defaultFilter, filter);
};

lib.getObject = (_data) => {
	let data = _data ? _data : {}
	if (typeof data === "string") {
		try {
			data = JSON.parse(data);
		} catch (err) {
			data = {};
		}
	}
	return data;
};

module.exports = lib;