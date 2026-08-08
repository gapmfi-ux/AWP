if (!window.API) {
  throw new Error('API core (api-core.js) must be loaded before api-user.js');
}

// USER API
API.getUserInfo = async function(options = {}) {
  return this.request('getUserInfo', {}, options);
};
