import superagent from "superagent";

async function defaultRefreshRoles({name,roles,token}, {baseUrl}) {
  try {
    let {body} = await superagent.get(`${baseUrl}/_users/org.couchdb.user:${name}`)
      .set("Authorization", "Bearer " + token)
      .accept("application/json");

    return body.roles;
  } catch(e) {
    let resp = e.response;
    if (!resp) throw e;
    return roles;
  }
}

export default function createRefreshRoles(refreshRoles=defaultRefreshRoles, couchOpts) {
  return async function(data) {
    if (typeof refreshRoles === "function") {
      return await refreshRoles.call(this, data, couchOpts);
    }

    return data.roles;
  };
}
