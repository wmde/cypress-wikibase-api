'use strict';

const MwApiPlugin = require( './MwApiPlugin' );

const mwApiCommands = MwApiPlugin.mwApiCommands;

const Util = {
	getTestString: ( prefix = '' ) => prefix + Math.random().toString() + '-Iñtërnâtiônàlizætiøn'
};

module.exports = {
	Util,
	mwApiCommands
};
