module.exports = function glslLoader(source) {
	if (this.cacheable) {
		this.cacheable();
	}

	return `export default ${JSON.stringify(source)};`;
};
