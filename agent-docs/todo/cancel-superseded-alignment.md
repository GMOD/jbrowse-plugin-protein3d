---
name: cancel-superseded-alignment
description:
  A superseded alignment still runs to the end in the RPC worker; cancel it.
metadata:
  category: ready
  area: alignment
  first_move:
    "Add a stop check to the DP loop, wired to the RPC call's abort `signal`."
  order: 3
---

A superseded alignment still runs to the end in the RPC worker; only its answer
is dropped. Rapid chain picks on a large complex queue several DPs ahead of the
one that counts. Cancelling needs the RPC call's abort `signal` and a DP loop
that checks it.
