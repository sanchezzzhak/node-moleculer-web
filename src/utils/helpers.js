const regexExecAll = (str, regex) => {
	let lastMatch = null;
	const matches = [];

	while ((lastMatch = regex.exec(str))) {
		matches.push(lastMatch);
		if (!regex.global) break;
	}

	return matches;
};

const redirectMetaTemplate = (location) => {
	const encodedLoc = location.replace(/"/g, "%22");
	return `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
};

const redirectJsTemplate = (location) => {
	return `<!DOCTYPE html><html><head><script>window.location.href='${location}'</script></head></html>`;
}

module.exports = {regexExecAll, redirectMetaTemplate, redirectJsTemplate}