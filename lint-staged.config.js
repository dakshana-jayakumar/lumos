export default {
  // Simplified configuration to prevent timeout/kill issues
  // Format files without heavy linting during commit
  '*.{ts,tsx,js,jsx}': ['prettier --write'],

  '*.json': ['prettier --write'],

  '*.md': ['prettier --write'],

  '*.{yml,yaml}': ['prettier --write'],
};
