import {omit} from "lodash";
import HTTPError from "./http-error";

function defaultTransform({name,roles,session,token,iat,exp}) {
  return {
    userCtx: { name, roles },
    session, token,
    issued: new Date(iat * 1000),
    expires: new Date(exp * 1000)
  };
}

export default function({transform=defaultTransform}) {
  return function(req, res, next) {
    res.ok = function(data) {
      if (req.accepts("json")) {
        if (typeof transform === "function") {
          data = transform.call(req.app, data, this);
        }

        return res.json({
          ok: true,
          ...omit(data, "ok")
        });
      }

      if (req.accepts("application/jwt")) {
        return res.type('application/jwt').send(data.token);
      }

      next(new HTTPError(406));
    };

    next();
  };
}
