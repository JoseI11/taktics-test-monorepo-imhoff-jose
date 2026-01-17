export default angular.module('app.loopback.config', []).config(LoopbackConfig);

function LoopbackConfig(LoopBackResourceProvider) {
  const envUrl = (process && process.env && process.env.API_URL) ? process.env.API_URL : null;
  const urlBase = envUrl || 'http://localhost:3000/api';
  LoopBackResourceProvider.setUrlBase(urlBase);
}

LoopbackConfig.$inject = ['LoopBackResourceProvider'];
