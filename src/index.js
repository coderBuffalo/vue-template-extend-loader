const validateOptions = require('schema-utils');
const { getOptions } = require('loader-utils');
const Extender = require('./extender');
const { name, extenderOptions, schemaOptions } = require('../package.json');

module.exports = function(source) {
    const callback = this.async();

    // 校验配置
    const options = {...extenderOptions, ...getOptions(this)};
    try {
        validateOptions(schemaOptions, options, name);
    } catch (error) {
        return callback(error, source);
    }

    const { tag_extender } = options;
    const EXTENDER_REGEXP = new RegExp(`<${tag_extender}\\b`, 'i');

    // extender标签不存在, 直接退出
    const extender_matcher = source.match(EXTENDER_REGEXP);
    if (!extender_matcher) return callback(null, source);

    const extender = new Extender(source, callback, options, this);
    extender.handleExtend();
};