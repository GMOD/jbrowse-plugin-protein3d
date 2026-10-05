---
name: cancel-superseded-alignment
description:
  A superseded alignment still runs to the end in the RPC worker; cancel it.
metadata:
  category: ready
  area: alignment
  first_move:
    'Add a stop check to the DP loop, wired to stopToken on v4 hosts and signal
    on v5.'
  order: 3
---

A superseded alignment still runs to the end in the RPC worker; only its answer
is dropped. Rapid chain picks on a large complex queue several DPs ahead of the
one that counts. Cancelling needs `stopToken` on v4 hosts and `signal` on v5,
and a DP loop that checks one.
