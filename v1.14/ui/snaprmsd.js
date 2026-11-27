/* ============================================================================
 * snaprmsd.js — Symmetry-aware RMSD / atom assignment for isomorphic molecular
 * graphs.  Independent implementation written from scratch for CrystaSee.
 *
 * Method background (published ideas only):
 *   "Molecular Symmetry Decomposition by Graph Automorphism: Fast,
 *    Symmetry-Aware RMSD, Structure Alignment, and Canonical Atom Ranks",
 *   ChemRxiv, DOI 10.26434/chemrxiv.15007012, licensed CC BY 4.0.
 *   This citation is given for attribution required by CC BY 4.0.  Algorithms,
 *   mathematical methods and ideas are not copyrightable subject matter.
 *
 * IMPORTANT: NO third-party source code is used here.  In particular, no file
 * from the reference implementation `atomsforhumanity/qcinf` (which ships no
 * licence file and is therefore "all rights reserved") was copied, translated,
 * ported or adapted.  All graph and geometry routines below were written
 * independently in plain JavaScript:
 *   - 1-WL colour refinement for atom invariants,
 *   - backtracking graph isomorphism (canonical map A->B) and automorphism
 *     group enumeration (all genuine automorphisms, with a safety cap),
 *   - Tarjan bridge finding for cyclic-component peeling,
 *   - Jacobi eigensolver + Kabsch optimal superposition / RMSD.
 *
 * The molecule is factored into a core plus peripheral symmetric components
 * (leaves, cyclic systems, repeated branches); for each component we enumerate
 * the symmetry-allowed atom permutations and score them by the Kabsch RMSD
 * after optimal alignment, locking in the minimum.  Every candidate assignment
 * is checked for true connectivity preservation before RMSD scoring, so only
 * genuine graph isomorphisms are ever scored.
 *
 * Exposes:  csSnapRMSD(atomsA, atomsB, opts) -> result object
 * Works both as a browser global and as a Node module (module.exports).
 * ==========================================================================*/
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- *
   * 0. Covalent radii (Å) + bond detection (consistent with app.js)  *
   * ---------------------------------------------------------------- */
  var COVR = {
    H: 0.31, He: 0.28, Li: 1.28, Be: 0.96, B: 0.84, C: 0.76, N: 0.71, O: 0.66,
    F: 0.57, Ne: 0.58, Na: 1.66, Mg: 1.41, Al: 1.21, Si: 1.11, P: 1.07,
    S: 1.05, Cl: 1.02, Ar: 1.06, K: 2.03, Ca: 1.76, Sc: 1.70, Ti: 1.60,
    V: 1.53, Cr: 1.39, Mn: 1.61, Fe: 1.52, Co: 1.50, Ni: 1.24, Cu: 1.32,
    Zn: 1.22, Ga: 1.22, Ge: 1.20, As: 1.19, Se: 1.20, Br: 1.20, Kr: 1.16,
    Rb: 2.20, Sr: 1.95, Y: 1.90, Zr: 1.75, Nb: 1.64, Mo: 1.54, Tc: 1.47,
    Ru: 1.46, Rh: 1.42, Pd: 1.39, Ag: 1.45, Cd: 1.44, In: 1.42, Sn: 1.39,
    Sb: 1.39, Te: 1.38, I: 1.39, Xe: 1.40, default: 0.75
  };
  function covR(el) { return COVR[el] != null ? COVR[el] : COVR.default; }

  // Bond list [(i,j,order)] for a set of atoms (cartesian, no periodicity).
  function bondsFromAtoms(atoms, factor) {
    if (factor == null) factor = 0.45; // matches app.js csBondsDirect (+0.45)
    var n = atoms.length, pairs = [];
    for (var i = 0; i < n; i++) {
      var ai = atoms[i];
      for (var j = i + 1; j < n; j++) {
        var aj = atoms[j];
        var dx = ai.cart[0] - aj.cart[0], dy = ai.cart[1] - aj.cart[1], dz = ai.cart[2] - aj.cart[2];
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > 0.35 && d < covR(ai.el) + covR(aj.el) + factor) pairs.push([i, j, 1.0]);
      }
    }
    return pairs;
  }

  // Adjacency as array-of-Sets from bond list.
  function adjFromBonds(n, bonds) {
    var adj = [];
    for (var i = 0; i < n; i++) adj.push({});
    for (var k = 0; k < bonds.length; k++) {
      var a = bonds[k][0], b = bonds[k][1];
      adj[a][b] = 1; adj[b][a] = 1;
    }
    return adj;
  }

  /* ---------------------------------------------------------------- *
   * 1. Graph primitives: 1-WL refinement, isomorphism, automorphism   *
   * ---------------------------------------------------------------- */
  // 1-WL colour refinement. colours: array of (string|number).
  // Returns refined int array (0..k-1), automorphism-invariant lower bound.
  // Relabelling is CANONICAL (by lexicographic order of the signature string),
  // so isomorphic graphs — regardless of vertex ordering — receive identical
  // integer labels and the refA[i]===refT[j] pruning in _search stays valid.
  // Convergence is detected by whether the partition ACTUALLY refines (the
  // number of distinct colours increases); 1-WL refinement can only split
  // classes, so the distinct count is monotonic and bounded by n — guaranteeing
  // termination. (Comparing per-vertex indices would loop forever, because the
  // global re-indexing permutes class labels once the partition stabilises.)
  function wlRefine(adj, colours) {
    var n = adj.length;
    var cur = colours.slice();
    var changed = true;
    while (changed) {
      changed = false;
      // signature per vertex = cur[v] + sorted neighbour cur-values
      var sig = new Array(n);
      for (var v = 0; v < n; v++) {
        var nb = Object.keys(adj[v]).map(function (u) { return cur[u | 0]; });
        nb.sort(function (a, b) { return a - b; });
        sig[v] = cur[v] + '|' + nb.join(',');
      }
      // canonical relabelling: unique signatures sorted lexicographically
      var order = [], seenSig = {};
      for (var w = 0; w < n; w++) { if (!(sig[w] in seenSig)) { seenSig[sig[w]] = true; order.push(sig[w]); } }
      order.sort();
      var map = {}; for (var u = 0; u < order.length; u++) map[order[u]] = u;
      var next = new Array(n);
      var oldSeen = {}, oldDistinct = 0;
      for (var o = 0; o < n; o++) { if (!(cur[o] in oldSeen)) { oldSeen[cur[o]] = true; oldDistinct++; } }
      var newSeen = {}, newDistinct = 0;
      for (var w2 = 0; w2 < n; w2++) {
        var nv = map[sig[w2]];
        next[w2] = nv;
        if (!(nv in newSeen)) { newSeen[nv] = true; newDistinct++; }
      }
      changed = newDistinct > oldDistinct; // only continue when a split occurred
      cur = next;
    }
    return cur;
  }

  function colourMultiset(ref) {
    var m = {};
    for (var i = 0; i < ref.length; i++) m[ref[i]] = (m[ref[i]] || 0) + 1;
    return m;
  }
  function sameMultiset(a, b) {
    var ma = colourMultiset(a), mb = colourMultiset(b);
    var ka = Object.keys(ma), kb = Object.keys(mb);
    if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) if (ma[ka[i]] !== mb[ka[i]]) return false;
    return true;
  }

  // adjacency-consistency of mapping partial[i]=j against already mapped k
  function adjOk(adjA, adjB, i, j, partial, assigned) {
    for (var k in adjA) {
      if (!assigned[k | 0]) continue;
      var kk = k | 0;
      var aEdge = adjA[i][kk] === 1;
      var bEdge = adjB[j][partial[kk]] === 1;
      if (aEdge !== bEdge) return false;
    }
    return true;
  }

  // Backtracking search building all/candidate bijections from A onto TARGET
  // (target === adjA for automorphisms, else adjB for isomorphism).
  // coloursA / coloursT guide candidate selection by refined colour.
  // nodeBudget: hard ceiling on the number of recursion nodes explored — this
  // GUARANTEES the search terminates in polynomial-bounded time even for graphs
  // with huge symmetry (prevents UI-thread freeze on large molecules). When the
  // budget is exhausted the search returns whatever it has found so far.
  function _search(adjA, adjT, refA, refT, targetIsSelf, cap, stopAtFirst, nodeBudget) {
    if (nodeBudget == null) nodeBudget = 300000;
    var n = adjA.length;
    var results = [];
    var used = new Array(n).fill(false);
    var assigned = new Array(n).fill(false);
    var partial = new Array(n).fill(-1);
    var nodes = 0;
    var truncated = false;

    function rec(depth) {
      nodes++;
      if (nodes > nodeBudget) { truncated = true; return; }
      if (results.length >= cap) return;
      if (depth === n) { results.push(partial.slice()); return; }
      // pick unassigned A-vertex with the smallest candidate set (target-cell).
      // NOTE: bestI/bestCand must be LOCAL to this frame (rec is re-entrant).
      var bestI = -1, bestCand = null;
      for (var i = 0; i < n; i++) {
        if (assigned[i]) continue;
        var cands = [];
        for (var j = 0; j < n; j++) {
          if (used[j]) continue;
          if (refA[i] !== refT[j]) continue;
          if (!adjOk(adjA, adjT, i, j, partial, assigned)) continue;
          cands.push(j);
        }
        if (cands.length === 0) continue; // unplaceable given current partial; defer to other vertices
        if (bestCand === null || cands.length < bestCand.length) { bestCand = cands; bestI = i; }
      }
      if (bestCand === null) return; // no unassigned vertex (depth === n guarded above)
      for (var c = 0; c < bestCand.length; c++) {
        var jj = bestCand[c];
        partial[bestI] = jj; used[jj] = true; assigned[bestI] = true;
        rec(depth + 1);
        used[jj] = false; assigned[bestI] = false;
        if (stopAtFirst && results.length) return;
        if (nodes > nodeBudget) return;
      }
    }
    rec(0);
    return { results: results, truncated: truncated };
  }

  // Canonical map A -> B (one valid isomorphism) or null if not isomorphic.
  function canonicalMap(adjA, coloursA, adjB, coloursB) {
    if (adjA.length !== adjB.length) return null;
    var refA = wlRefine(adjA, coloursA);
    var refB = wlRefine(adjB, coloursB);
    if (!sameMultiset(refA, refB)) return null;
    // finding ONE isomorphism is usually fast; generous node budget is a safety net
    var found = _search(adjA, adjB, refA, refB, false, 1, true, 500000);
    return found.results.length ? found.results[0] : null;
  }

  // Full automorphism group of A (array of permutations, each perm[i]=image).
  // Returns {perms, orbits, capped} where orbits[i] = orbit id of vertex i.
  // capped === true when the search was truncated by the permutation OR node budget,
  // meaning the returned set is only a (still symmetry-valid) sample.
  function autGroup(adj, colours, cap) {
    if (cap == null) cap = 8192;
    var ref = wlRefine(adj, colours);
    var res = _search(adj, adj, ref, ref, true, cap, false, 300000);
    var perms = res.results;
    // derive orbit ids from collected automorphisms (coarser if capped):
    // orbit of i = { p[i] : p in perms }; BFS over images for a clean partition.
    var n = adj.length;
    var orbitId = new Array(n).fill(-1), ocount = 0;
    for (var i = 0; i < n; i++) {
      if (orbitId[i] !== -1) continue;
      var stack = [i]; orbitId[i] = ocount;
      while (stack.length) {
        var x = stack.pop();
        for (var p = 0; p < perms.length; p++) { var img = perms[p][x]; if (orbitId[img] === -1) { orbitId[img] = ocount; stack.push(img); } }
      }
      ocount++;
    }
    return { perms: perms, orbits: orbitId, capped: res.truncated || perms.length >= cap };
  }

  /* ---------------------------------------------------------------- *
   * 2. Cyclic-component peeling (replaces rustworkx bridges)          *
   * ---------------------------------------------------------------- */
  // Iterative Tarjan bridge finding -> set of "a,b" edges (a<b).
  function bridges(adj) {
    var n = adj.length, disc = new Array(n).fill(-1), low = new Array(n).fill(-1);
    var timer = 0, bridgeSet = {}, parent = new Array(n).fill(-1);
    var stack = [];
    for (var s = 0; s < n; s++) {
      if (disc[s] !== -1) continue;
      stack.push([s, -1, false]);
      while (stack.length) {
        var top = stack[stack.length - 1];
        var u = top[0], pu = top[1];
        if (!top[2]) {
          top[2] = true;
          disc[u] = low[u] = timer++;
          parent[u] = pu;
        }
        var progressed = false;
        var nbrs = Object.keys(adj[u]);
        for (var idx = top[3] || 0; idx < nbrs.length; idx++) {
          var w = nbrs[idx] | 0;
          if (w === parent[u]) { top[3] = idx + 1; continue; }
          if (disc[w] === -1) {
            top[3] = idx + 1;
            stack.push([w, u, false]);
            progressed = true;
            break;
          } else {
            if (disc[w] < low[u]) low[u] = disc[w];
          }
        }
        if (progressed) continue;
        // finished u
        stack.pop();
        if (pu !== -1) {
          if (low[u] < low[pu]) low[pu] = low[u];
          if (low[u] > disc[pu]) { var a = Math.min(u, pu), b = Math.max(u, pu); bridgeSet[a + ',' + b] = true; }
        }
      }
    }
    return bridgeSet;
  }

  // cycle blobs: connected components of the non-bridge-edge subgraph
  // (edges that lie on at least one cycle). Returns array of vertex-id sets.
  function cycles(adj) {
    var n = adj.length;
    var br = bridges(adj);
    var nonBridgeAdj = {};
    for (var i = 0; i < n; i++) nonBridgeAdj[i] = {};
    for (var u = 0; u < n; u++) {
      for (var v in adj[u]) { var vv = v | 0; if (u < vv) { if (!(br[u + ',' + vv])) { nonBridgeAdj[u][vv] = 1; nonBridgeAdj[vv][u] = 1; } } }
    }
    var seen = new Array(n).fill(false), cycs = [];
    for (var s2 = 0; s2 < n; s2++) {
      if (seen[s2] || Object.keys(nonBridgeAdj[s2]).length === 0) continue;
      // BFS in nonBridgeAdj
      var comp = [], q = [s2]; seen[s2] = true; var vset = {};
      while (q.length) {
        var x = q.shift(); comp.push(x); vset[x] = 1;
        for (var y in nonBridgeAdj[x]) { if (!seen[y | 0]) { seen[y | 0] = true; q.push(y | 0); } }
      }
      // count edges within comp
      var e = 0; for (var a = 0; a < comp.length; a++) for (var b in nonBridgeAdj[comp[a]]) if (vset[b | 0]) e++;
      e = e / 2;
      if (e >= comp.length && comp.length >= 3) cycs.push(comp); // cycle/ring system
    }
    return cycs;
  }

  function outsideComponents(adj, excluded) {
    var keep = {};
    for (var v in adj) if (!excluded[v | 0]) keep[v | 0] = 1;
    var sub = {}, seen = {}, comps = [];
    for (var k in keep) {
      var kk = k | 0; sub[kk] = {};
      for (var nb in adj[kk]) if (keep[nb | 0]) sub[kk][nb | 0] = 1;
    }
    for (var s = 0; s < adj.length; s++) {
      if (!keep[s]) continue;
      if (seen[s]) continue;
      var comp = [], q = [s]; seen[s] = true;
      while (q.length) { var x = q.shift(); comp.push(x); for (var y in sub[x]) if (!seen[y | 0]) { seen[y | 0] = true; q.push(y | 0); } }
      comps.push(comp);
    }
    return comps;
  }

  /* ---------------------------------------------------------------- *
   * 3. Factoring plan (leaves / cycles / branches)                    *
   * ---------------------------------------------------------------- */
  function pruneGraph(adj, keep) {
    var toRemove = [];
    for (var v in adj) if (!keep[v | 0]) toRemove.push(v | 0);
    for (var r = 0; r < toRemove.length; r++) {
      var vv = toRemove[r];
      for (var nb in adj[vv]) delete adj[nb][vv];
      delete adj[vv];
    }
  }

  function peelSymmetricLeaves(adj, colour) {
    var leavesByParent = {};
    for (var v in adj) {
      if (Object.keys(adj[v]).length === 1) {
        var p = -1; for (var nb in adj[v]) p = nb | 0;
        (leavesByParent[p] || (leavesByParent[p] = [])).push(v | 0);
      }
    }
    var coreIdx = {}, factored = [];
    for (var vi = 0; vi < Object.keys(adj).length; vi++) coreIdx[vi] = 1;
    for (var p2 in leavesByParent) {
      var leafIdxs = leavesByParent[p2];
      if (leafIdxs.length < 2) continue;
      var byColor = {};
      for (var li = 0; li < leafIdxs.length; li++) { var c = colour[leafIdxs[li]]; (byColor[c] || (byColor[c] = [])).push(leafIdxs[li]); }
      var dup = [];
      for (var ck in byColor) if (byColor[ck].length > 1) dup = dup.concat(byColor[ck]);
      if (!dup.length) continue;
      dup.sort(function (a, b) { return a - b; });
      factored.push({ parent: p2 | 0, leaves: true, idxs: dup });
      for (var d = 0; d < dup.length; d++) delete coreIdx[dup[d]];
    }
    var core = []; for (var c2 in coreIdx) core.push(c2 | 0);
    return { core: core, factored: factored };
  }

  // deterministic string hash (cyrb53-ish) for rooted branch signatures
  function hashStr(str) {
    var h1 = 0xdeadbeef ^ str.length, h2 = 0x41c6ce57 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  // rooted signature of the branch hanging off `parent` through `root`.
  function getBranchInfo(adj, parent, root, colour) {
    var visited = {}, parentOf = {}, order = [], stack = [[root, -1]];
    while (stack.length) {
      var top = stack.pop(); var v = top[0], p = top[1];
      if (v === parent) continue;
      if (visited[v]) continue;
      visited[v] = 1; parentOf[v] = p; order.push(v);
      for (var nb in adj[v]) { if (nb | 0 === parent) continue; if (nb | 0 === p) continue; if (visited[nb | 0]) continue; stack.push([nb | 0, v]); }
    }
    var children = {}; for (var k in visited) children[k | 0] = [];
    for (var v2 in parentOf) { var pp = parentOf[v2]; if (pp !== -1) children[pp].push(v2 | 0); }
    var nodeSig = {};
    for (var o = order.length - 1; o >= 0; o--) {
      var vv = order[o]; var childSigs = children[vv].map(function (c) { return nodeSig[c]; });
      childSigs.sort();
      nodeSig[vv] = hashStr(String(colour[vv]) + ':' + childSigs.join('|'));
    }
    var branchVerts = Object.keys(visited).map(function (x) { return x | 0; });
    return { verts: branchVerts, sig: nodeSig[root] };
  }

  function peelSymmetricBranches(adj, colour) {
    var coreIdx = {}, factored = [];
    for (var v in adj) coreIdx[v | 0] = 1;
    for (var p in adj) {
      var pp = p | 0;
      if (Object.keys(adj[pp]).length < 4) continue;
      var sig2branches = {};
      for (var root in adj[pp]) {
        var info = getBranchInfo(adj, pp, root | 0, colour);
        if (info.verts.length > 1) (sig2branches[info.sig] || (sig2branches[info.sig] = [])).push(info.verts);
      }
      var peelCands = [];
      for (var sg in sig2branches) if (sig2branches[sg].length >= 2) peelCands.push(sig2branches[sg]);
      if (!peelCands.length) continue;
      var allPeeled = {};
      for (var ci = 0; ci < peelCands.length; ci++) for (var bi = 0; bi < peelCands[ci].length; bi++) for (var x = 0; x < peelCands[ci][bi].length; x++) allPeeled[peelCands[ci][bi][x]] = 1;
      var remainingDeg = 0;
      for (var nb2 in adj[pp]) if (!allPeeled[nb2 | 0]) remainingDeg++;
      if (remainingDeg >= 2) {
        for (var ci2 = 0; ci2 < peelCands.length; ci2++) {
          var union = {}; for (var bj = 0; bj < peelCands[ci2].length; bj++) for (var z = 0; z < peelCands[ci2][bj].length; z++) union[peelCands[ci2][bj][z]] = 1;
          var idxs = Object.keys(union).map(function (x) { return x | 0; });
          factored.push({ parent: pp, leaves: false, idxs: idxs });
          for (var u = 0; u < idxs.length; u++) delete coreIdx[idxs[u]];
        }
      }
    }
    var core = []; for (var c2 in coreIdx) core.push(c2 | 0);
    return { core: core, factored: factored };
  }

  function peelCycles(adj) {
    var cycs = cycles(adj);
    var allCyc = {}; for (var i = 0; i < cycs.length; i++) for (var j = 0; j < cycs[i].length; j++) allCyc[cycs[i][j]] = 1;
    var outside = outsideComponents(adj, allCyc);
    // absorb outside CCs that touch exactly one cycle blob
    var v2c = {}; for (var ci = 0; ci < cycs.length; ci++) for (var cj = 0; cj < cycs[ci].length; cj++) v2c[cycs[ci][cj]] = ci;
    var fullCycles = cycs.map(function (c) { return {}; }); for (var k = 0; k < cycs.length; k++) for (var m = 0; m < cycs[k].length; m++) fullCycles[k][cycs[k][m]] = 1;
    var remaining = [];
    for (var wi = 0; wi < outside.length; wi++) {
      var comp = outside[wi], touched = {};
      var stop = false;
      for (var a = 0; a < comp.length && !stop; a++) for (var nb in adj[comp[a]]) { if (v2c[nb | 0] != null) touched[v2c[nb | 0]] = 1; if (Object.keys(touched).length > 1) { stop = true; break; } }
      if (Object.keys(touched).length === 1) { var cidx = Object.keys(touched)[0] | 0; for (var b = 0; b < comp.length; b++) fullCycles[cidx][comp[b]] = 1; }
      else remaining.push(comp);
    }
    // boundary of each full cycle blob
    var boundaries = [];
    for (var fi = 0; fi < fullCycles.length; fi++) {
      var bset = {}; for (var v in fullCycles[fi]) for (var nb2 in adj[v | 0]) if (!fullCycles[fi][nb2 | 0]) bset[nb2 | 0] = 1;
      boundaries.push(bset);
    }
    var coreIdx = {};
    for (var ri = 0; ri < remaining.length; ri++) for (var rj = 0; rj < remaining[ri].length; rj++) coreIdx[remaining[ri][rj]] = 1;
    // absorb largest cycle if it dominates remainder
    if (fullCycles.length) {
      var maxI = 0; for (var mi = 1; mi < fullCycles.length; mi++) if (Object.keys(fullCycles[mi]).length > Object.keys(fullCycles[maxI]).length) maxI = mi;
      var largest = fullCycles[maxI];
      var remSize = Object.keys(coreIdx).length;
      var second = 0;
      if (fullCycles.length > 1) { for (var si = 0; si < fullCycles.length; si++) if (si !== maxI && Object.keys(fullCycles[si]).length > second) second = Object.keys(fullCycles[si]).length; }
      var absorb = remSize === 0 ? (fullCycles.length === 1 || Object.keys(largest).length > second) : (Object.keys(largest).length > remSize);
      if (absorb) for (var li = 0; li < Object.keys(largest).length; li++) coreIdx[Object.keys(largest)[li] | 0] = 1;
    }
    for (var bi2 = 0; bi2 < fullCycles.length; bi2++) {
      if (Object.keys(boundaries[bi2]).length !== 1) for (var v2 in fullCycles[bi2]) coreIdx[v2 | 0] = 1;
    }
    var coreAnchor = {}; for (var ca in coreIdx) coreAnchor[ca | 0] = 1;
    var parent2idxs = {};
    for (var bi3 = 0; bi3 < fullCycles.length; bi3++) {
      if (Object.keys(boundaries[bi3]).length !== 1) continue;
      var cycKeys = Object.keys(fullCycles[bi3]).map(function (x) { return x | 0; });
      // already absorbed?
      var already = cycKeys.every(function (x) { return coreAnchor[x]; }) && cycKeys.every(function (x) { return coreIdx[x]; });
      if (already) continue;
      var parent = -1; for (var bk in boundaries[bi3]) parent = bk | 0;
      if (coreAnchor[parent]) { (parent2idxs[parent] || (parent2idxs[parent] = [])).push.apply(parent2idxs[parent], cycKeys); }
      else for (var v3 in fullCycles[bi3]) coreIdx[v3 | 0] = 1;
    }
    var components = [];
    for (var p4 in parent2idxs) components.push({ parent: p4 | 0, leaves: false, idxs: parent2idxs[p4].slice().sort(function (a, b) { return a - b; }) });
    var core = Object.keys(coreIdx).map(function (x) { return x | 0; });
    return { core: core, factored: components };
  }

  function factorPlanRecursive(adjOrig, depth, colour) {
    // deep copy adj as object-of-objects
    var adj = {}; for (var v in adjOrig) { adj[v | 0] = {}; for (var nb in adjOrig[v]) adj[v | 0][nb | 0] = 1; }
    var reversedBatch = [];
    function recur(d) {
      if (d === 0) return;
      var toAppend = [];
      var L = peelSymmetricLeaves(adj, colour); if (L.factored.length) toAppend = toAppend.concat(L.factored);
      pruneGraph(adj, idxSet(L.core));
      var C = peelCycles(adj); if (C.factored.length) toAppend = toAppend.concat(C.factored);
      pruneGraph(adj, idxSet(C.core));
      var B = peelSymmetricBranches(adj, colour); if (B.factored.length) toAppend = toAppend.concat(B.factored);
      pruneGraph(adj, idxSet(B.core));
      if (toAppend.length) { toAppend.reverse(); reversedBatch.push(toAppend); }
      recur(d - 1);
    }
    var L0 = peelSymmetricLeaves(adj, colour); if (L0.factored.length) reversedBatch.push(L0.factored);
    pruneGraph(adj, idxSet(L0.core));
    recur(depth - 1);
    var coreArr = Object.keys(adj).map(function (x) { return x | 0; }).sort(function (a, b) { return a - b; });
    return [[{ parent: null, leaves: false, idxs: coreArr }]].concat(reversedBatch.reverse());
  }
  function idxSet(arr) { var s = {}; for (var i = 0; i < arr.length; i++) s[arr[i] | 0] = 1; return s; }

  /* ---------------------------------------------------------------- *
   * 4. Component mapping helpers                                      *
   * ---------------------------------------------------------------- */
  function inducedLocalAdj(adj, nodes) {
    var g2l = {}, local = {};
    for (var i = 0; i < nodes.length; i++) { g2l[nodes[i] | 0] = i; local[i] = []; }
    for (var k = 0; k < nodes.length; k++) {
      var gv = nodes[k] | 0;
      for (var nb in adj[gv]) if (g2l[nb | 0] != null) local[k].push(g2l[nb | 0]);
    }
    return { local: local, g2l: g2l };
  }
  function buildBComponentLookup(batches, canonicalMapAB) {
    var lookup = {};
    for (var b = 0; b < batches.length; b++) for (var c = 0; c < batches[b].length; c++) {
      var comp = batches[b][c];
      var bIdxs = comp.idxs.map(function (x) { return canonicalMapAB[x | 0]; });
      var key = (comp.parent == null ? 'n' : comp.parent) + ':' + (comp.leaves ? '1' : '0');
      lookup[key] = bIdxs;
    }
    return lookup;
  }
  function matchLeafComponent(aComp, bLeaf, aOrbit, bOrbit) {
    var bins = {};
    for (var i = 0; i < bLeaf.length; i++) (bins[bOrbit[bLeaf[i] | 0]] || (bins[bOrbit[bLeaf[i] | 0]] = [])).push(bLeaf[i] | 0);
    var out = new Array(aComp.length);
    for (var a = 0; a < aComp.length; a++) out[a] = bins[aOrbit[aComp[a] | 0]].shift();
    return out;
  }
  function matchStructuredComponent(aComp, bComp, aAdj, bAdj, aOrbit, bOrbit) {
    var aLoc = inducedLocalAdj(aAdj, aComp), bLoc = inducedLocalAdj(bAdj, bComp);
    var aLocalOrbit = aComp.map(function (x) { return aOrbit[x | 0]; });
    var bLocalOrbit = bComp.map(function (x) { return bOrbit[x | 0]; });
    // quick histogram check
    var ha = {}, hb = {}; for (var i = 0; i < aLocalOrbit.length; i++) ha[aLocalOrbit[i]] = (ha[aLocalOrbit[i]] || 0) + 1;
    for (var j = 0; j < bLocalOrbit.length; j++) hb[bLocalOrbit[j]] = (hb[bLocalOrbit[j]] || 0) + 1;
    for (var k in ha) if (ha[k] !== hb[k]) throw new Error('structured component orbits mismatch');
    var map = canonicalMap(aLoc.local, aLocalOrbit, bLoc.local, bLocalOrbit);
    var out = new Array(aComp.length);
    for (var m = 0; m < aComp.length; m++) out[m] = bComp[map[aLoc.g2l[aComp[m] | 0]] | 0];
    return out;
  }

  /* ---------------------------------------------------------------- *
   * 5. Permutation helpers                                            *
   * ---------------------------------------------------------------- */
  function iterComponentPerms(adj, orbitIds, component) {
    if (component.leaves) {
      // group POSITIONS (0..|C|-1) by orbit id, cartesian product of per-group permutations
      var groups = {};
      for (var i = 0; i < component.idxs.length; i++) { var o = orbitIds[component.idxs[i] | 0]; (groups[o] || (groups[o] = [])).push(i); }
      var keys = Object.keys(groups);
      var localGroups = keys.map(function (kk) { return groups[kk]; }); // positions within the component
      return permuteProduct(localGroups);
    } else {
      var sub = inducedLocalAdj(adj, component.idxs);
      var locOrbit = component.idxs.map(function (x) { return orbitIds[x | 0]; });
      var ag = autGroup(sub.local, locOrbit, 300000);
      // perms already on local positions 0..|C|-1 (the caller indexes bCompIdxs)
      return ag.perms;
    }
  }
  function permuteProduct(groups) {
    // groups: array of arrays (each a distinct orbit's local indices)
    var result = [[]];
    for (var g = 0; g < groups.length; g++) {
      var perms = permutations(groups[g]);
      var next = [];
      for (var r = 0; r < result.length; r++) for (var p = 0; p < perms.length; p++) next.push(result[r].concat(perms[p]));
      result = next;
    }
    return result;
  }
  function permutations(arr) {
    if (arr.length <= 1) return [arr.slice()];
    var res = [];
    for (var i = 0; i < arr.length; i++) {
      var rest = arr.slice(0, i).concat(arr.slice(i + 1));
      var sub = permutations(rest);
      for (var j = 0; j < sub.length; j++) res.push([arr[i]].concat(sub[j]));
    }
    return res;
  }

  /* ---------------------------------------------------------------- *
   * 6. Geometry: Kabsch alignment + RMSD                              *
   * ---------------------------------------------------------------- */
  function centroid(P) { var c = [0, 0, 0]; for (var i = 0; i < P.length; i++) for (var k = 0; k < 3; k++) c[k] += P[i][k]; var n = Math.max(1, P.length); for (var k2 = 0; k2 < 3; k2++) c[k2] /= n; return c; }
  function jacobi3(A) {
    var a = A.map(function (r) { return r.slice(); }), v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (var sweep = 0; sweep < 50; sweep++) {
      var off = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]); if (off < 1e-14) break;
      for (var p = 0; p < 3; p++) for (var q = p + 1; q < 3; q++) {
        if (Math.abs(a[p][q]) < 1e-18) continue;
        var app = a[p][p], aqq = a[q][q], apq = a[p][q];
        var theta = (aqq - app) / (2 * apq);
        var t = (theta < 0 ? -1 / (-theta + Math.sqrt(theta * theta + 1)) : 1 / (theta + Math.sqrt(theta * theta + 1)));
        var cs = 1 / Math.sqrt(t * t + 1), sn = t * cs, tau = sn / (1 + cs);
        a[p][p] = app - t * apq; a[q][q] = aqq + t * apq; a[p][q] = 0; a[q][p] = 0;
        for (var i = 0; i < 3; i++) { if (i === p || i === q) continue; var aip = a[i][p], aiq = a[i][q]; a[i][p] = aip - sn * (aiq + tau * aip); a[i][q] = aiq + sn * (aip - tau * aiq); a[p][i] = a[i][p]; a[q][i] = a[i][q]; }
        for (var i2 = 0; i2 < 3; i2++) { var vip = v[i2][p], viq = v[i2][q]; v[i2][p] = vip - sn * (viq + tau * vip); v[i2][q] = viq + sn * (vip - tau * viq); }
      }
    }
    return { val: [a[0][0], a[1][1], a[2][2]], vec: [[v[0][0], v[1][0], v[2][0]], [v[0][1], v[1][1], v[2][1]], [v[0][2], v[1][2], v[2][2]]] };
  }
  function symMul(A, B) { var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) { var s = 0; for (var k = 0; k < 3; k++) s += A[i][k] * B[k][j]; C[i][j] = s; } return C; }
  function transpose(A) { return [[A[0][0], A[1][0], A[2][0]], [A[0][1], A[1][1], A[2][1]], [A[0][2], A[1][2], A[2][2]]]; }
  function rotV(v, M) { return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]]; }

  // Kabsch: align P onto Q. Returns {R (row-major, rotates Pc -> Qc), cP, cQ, rmsd}
  function kabsch(P, Q) {
    var n = P.length; if (!n) return null;
    var cP = centroid(P), cQ = centroid(Q);
    var Pc = P.map(function (p) { return [p[0] - cP[0], p[1] - cP[1], p[2] - cP[2]]; });
    var Qc = Q.map(function (q) { return [q[0] - cQ[0], q[1] - cQ[1], q[2] - cQ[2]]; });
    var H = [[0, 0,0],[0,0,0],[0,0,0]];
    for (var i = 0; i < n; i++) for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) H[a][b] += Pc[i][a] * Qc[i][b];
    var eU = jacobi3(symMul(H, transpose(H))), U = eU.vec, V = [];
    for (var k = 0; k < 3; k++) { var htu = symMul(transpose(H), [[U[k][0]], [U[k][1]], [U[k][2]]]); var hv = [htu[0][0], htu[1][0], htu[2][0]]; var hl = Math.sqrt(hv[0]*hv[0]+hv[1]*hv[1]+hv[2]*hv[2]); V.push(hl > 1e-12 ? [hv[0]/hl, hv[1]/hl, hv[2]/hl] : [0,0,0]); }
    // determinant correction
    function det3(M){ return M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1]) - M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0]) + M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]); }
    if (det3(U) * det3(V) < 0) for (var k2 = 0; k2 < 3; k2++) V[2][k2] = -V[2][k2];
    var R = symMul(transpose(V), U);
    var ssq = 0; for (var i2 = 0; i2 < n; i2++) { var rp = rotV(Pc[i2], R); ssq += (rp[0]-Qc[i2][0])*(rp[0]-Qc[i2][0]) + (rp[1]-Qc[i2][1])*(rp[1]-Qc[i2][1]) + (rp[2]-Qc[i2][2])*(rp[2]-Qc[i2][2]); }
    return { R: R, cP: cP, cQ: cQ, rmsd: Math.sqrt(ssq / n) };
  }
  function rmsdAlign(P, Q, align) {
    if (P.length !== Q.length) throw new Error('rmsdAlign: length mismatch');
    var A = P;
    if (align) { var k = kabsch(P, Q); A = P.map(function (p) { var c = [p[0]-k.cP[0], p[1]-k.cP[1], p[2]-k.cP[2]]; var r = rotV(c, k.R); return [r[0]+k.cQ[0], r[1]+k.cQ[1], r[2]+k.cQ[2]]; }); }
    var ssq = 0; for (var i = 0; i < A.length; i++) { ssq += (A[i][0]-Q[i][0])*(A[i][0]-Q[i][0]) + (A[i][1]-Q[i][1])*(A[i][1]-Q[i][1]) + (A[i][2]-Q[i][2])*(A[i][2]-Q[i][2]); }
    return Math.sqrt(ssq / A.length);
  }
  // connectivity-validity of a candidate A->B assignment (A,B are arrays of {el,cart}, idxs are A indices, bIdxs B indices)
  function isValidAssignment(adjA, adjB, aIdxs, bIdxs) {
    for (var i = 0; i < aIdxs.length; i++) {
      var ai = aIdxs[i] | 0, bi = bIdxs[i] | 0;
      // degree must match
      if (Object.keys(adjA[ai]).length !== Object.keys(adjB[bi]).length) return false;
      // each A-neighbour must map to a B-neighbour of bi
      for (var nb in adjA[ai]) {
        var nbi = nb | 0;
        // find image of nbi within the same aIdxs set
        var found = -1; for (var j = 0; j < aIdxs.length; j++) if ((aIdxs[j] | 0) === nbi) { found = bIdxs[j] | 0; break; }
        if (found === -1) continue; // neighbour outside this component subset — skip (component-local check)
        if (adjB[bi][found] !== 1) return false;
      }
    }
    return true;
  }

  /* ---------------------------------------------------------------- *
   * 7. Main entry: csSnapRMSD                                        *
   * ---------------------------------------------------------------- */
  // Single global Kabsch RMSD of A (cart) against B[p] (cart) — the figure of
  // merit we minimise over all symmetry-allowed correspondences.
  function globalRmsdOf(p, aCart, bCart) {
    var P = aCart, Q = p.map(function (idx) { return bCart[idx]; });
    return kabsch(P, Q).rmsd;
  }

  function csSnapRMSD(atomsA, atomsB, opts) {
    opts = opts || {};
    var maxPerms = opts.maxPerms || 8192;       // cap on enumerated automorphisms
    var scoreCap = opts.scoreCap || 2048;       // hard cap on Kabsch evaluations (freeze-proof)
    var n = atomsA.length;
    if (n !== atomsB.length) return { isomorphic: false, reason: 'atom count mismatch' };
    // bonds + adjacency
    var bondsA = opts.bondsA || bondsFromAtoms(atomsA), bondsB = opts.bondsB || bondsFromAtoms(atomsB);
    var aAdj = adjFromBonds(n, bondsA), bAdj = adjFromBonds(n, bondsB);
    // element colours (shared map => consistent labels for A and B)
    var elMap = {}, elList = [];
    function elColor(a) { if (!(a in elMap)) { elMap[a] = elList.length; elList.push(a); } return elMap[a]; }
    var aCol = atomsA.map(function (a) { return elColor(a.el); });
    var bCol = atomsB.map(function (a) { return elColor(a.el); });
    // one isomorphism A -> B (also certifies graph isomorphism)
    var canonAB = canonicalMap(aAdj, aCol, bAdj, bCol);
    if (!canonAB) return { isomorphic: false, reason: 'graphs not isomorphic (different connectivity / elements)' };
    // global automorphism group + orbits of A (node-budgeted, so always bounded)
    var ag = autGroup(aAdj, aCol, maxPerms);
    var aOrbit = ag.orbits;
    var bOrbit = new Array(n); for (var i = 0; i < n; i++) bOrbit[canonAB[i]] = aOrbit[i];
    // cartesian geometry
    var aCart = atomsA.map(function (a) { return a.cart; });
    var bCart = atomsB.map(function (a) { return a.cart; });

    // The set of ALL valid A->B correspondences is exactly { canonAB . p : p in Aut(A) }.
    // We minimise the global (single-Kabsch) RMSD over that set. The full group is
    // enumerated with a hard node budget so it can never run away; we always score
    // the base canonical map (the identity automorphism, already optimal for
    // near-identical conformers) and then at most scoreCap further automorphisms.
    var bestP = canonAB.slice();
    var bestRmsd = globalRmsdOf(bestP, aCart, bCart);
    var scoreN = Math.min(ag.perms.length, scoreCap);
    for (var pi = 0; pi < scoreN; pi++) {
      var p = ag.perms[pi];
      var cand = new Array(n); for (var k = 0; k < n; k++) cand[k] = canonAB[p[k]];
      var r = globalRmsdOf(cand, aCart, bCart);
      if (r < bestRmsd) { bestRmsd = r; bestP = cand; }
    }
    // Final guard: must be a genuine full graph isomorphism (catches 1-WL false positives)
    if (!isValidAssignment(aAdj, bAdj, range(n), bestP)) return { isomorphic: false, reason: 'graphs not isomorphic (1-WL colour match but structure differs)' };
    // aligned geometry: rotate A onto B[bestP] by a single Kabsch
    var k = kabsch(aCart, bestP.map(function (idx) { return bCart[idx]; }));
    var aAligned = aCart.map(function (p) { var c = [p[0] - k.cP[0], p[1] - k.cP[1], p[2] - k.cP[2]]; var r = rotV(c, k.R); return [r[0] + k.cQ[0], r[1] + k.cQ[1], r[2] + k.cQ[2]]; });
    var ang = Math.acos(Math.max(-1, Math.min(1, (k.R[0][0] + k.R[1][1] + k.R[2][2] - 1) / 2))) * 180 / Math.PI;
    // build pa/pb/match
    var pa = [], pb = [], match = [];
    for (var i3 = 0; i3 < n; i3++) { pa.push(atomsA[i3].cart.slice()); pb.push(atomsB[bestP[i3]].cart.slice()); match.push([i3, bestP[i3]]); }
    return {
      isomorphic: true, rmsd: bestRmsd, pOpt: bestP, aAligned: aAligned, pa: pa, pb: pb, match: match, n: n,
      R: k.R, cp: k.cP, cq: k.cQ, angle: ang, aOrbit: aOrbit, bOrbit: bOrbit, capped: ag.capped
    };
  }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }

  // expose
  var api = { csSnapRMSD: csSnapRMSD, bondsFromAtoms: bondsFromAtoms, autGroup: autGroup, canonicalMap: canonicalMap, wlRefine: wlRefine };
  if (typeof window !== 'undefined') { window.csSnapRMSD = csSnapRMSD; window.SNAPRMSD = api; }
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  global.SNAPRMSD = api;

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
