import { spawnSync } from "child_process"
import * as store from "./store"

export function select(upstream: string): Backend {
  if (/\d$/.test(upstream)) return store.backendList[0]
  const result = store.selectDomain(upstream)
  if (result) {
    setTimeout(() => {
      store.trimHistory(20)
      const { error0, error1 } = store.countConnErr(upstream)
      if (error0 > error1) {
        store.updateDomain(upstream, 1)
      } else if (error0 < error1) {
        store.updateDomain(upstream, 0)
      } else {
        const { ok, fail } = store.countReadErr(upstream, result.prefer)
        if (ok < fail) {
          store.updateDomain(upstream, 1 - result.prefer)
        } else if (result.prefer === 1) {
          const { duration } = store.averageDuration(upstream, 1)
          if (duration > 1000) {
            const child = spawnSync("curl", `-I -L -m 1 http://${upstream}/`.split(" "))
            if (child.status === 0) store.updateDomain(upstream, 0)
          }
        }
      }
    }, 0)
    return store.backendList[result.prefer]
  } else {
    const child = spawnSync("curl", `-I -L -m 1 http://${upstream}/`.split(" "))
    const prefer = child.status === 0 ? 0 : 1
    store.updateDomain(upstream, prefer)
    return store.backendList[prefer]
  }
}
