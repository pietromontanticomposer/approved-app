// Run with: node scripts/test_comments_review_rules.js

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });
require('tsconfig-paths/register');

const assert = require('assert');
const Module = require('module');

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const CLIENT_ID = '22222222-2222-4222-8222-222222222222';
const PROJECT_ID = '33333333-3333-4333-8333-333333333333';
const CUE_ID = '44444444-4444-4444-8444-444444444444';
const VERSION_ID = '55555555-5555-4555-8555-555555555555';

const db = {
  projects: [
    { id: PROJECT_ID, owner_id: OWNER_ID }
  ],
  cues: [
    { id: CUE_ID, project_id: PROJECT_ID }
  ],
  versions: [
    { id: VERSION_ID, cue_id: CUE_ID, status: 'in_review' }
  ],
  comments: []
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyFilters(rows, filters) {
  return rows.filter((row) =>
    filters.every((filter) => String(row[filter.key]) === String(filter.value))
  );
}

function decorateRow(table, row, selectCols) {
  const decorated = clone(row);

  if (table === 'versions' && selectCols && selectCols.includes('cues(project_id)')) {
    const cue = db.cues.find((item) => item.id === row.cue_id);
    decorated.cues = cue ? { project_id: cue.project_id } : null;
  }

  if (table === 'comments' && selectCols && selectCols.includes('versions(')) {
    const version = db.versions.find((item) => item.id === row.version_id);
    const cue = version ? db.cues.find((item) => item.id === version.cue_id) : null;
    decorated.versions = version
      ? { cue_id: version.cue_id, cues: cue ? { project_id: cue.project_id } : null }
      : null;
  }

  return decorated;
}

function createQuery(table) {
  const state = {
    filters: [],
    selectCols: '*',
    orderBy: null
  };

  const query = {
    select(cols) {
      state.selectCols = cols || '*';
      return query;
    },
    eq(key, value) {
      state.filters.push({ key, value });
      return query;
    },
    order(key, options = {}) {
      state.orderBy = { key, ascending: options.ascending !== false };
      return query;
    },
    async maybeSingle() {
      let rows = applyFilters(db[table] || [], state.filters);
      if (state.orderBy) {
        rows = rows.slice().sort((left, right) => {
          const a = left[state.orderBy.key];
          const b = right[state.orderBy.key];
          if (a === b) return 0;
          return state.orderBy.ascending ? (a > b ? 1 : -1) : (a > b ? -1 : 1);
        });
      }
      return {
        data: rows[0] ? decorateRow(table, rows[0], state.selectCols) : null,
        error: null
      };
    },
    async single() {
      const result = await query.maybeSingle();
      return result.data
        ? result
        : { data: null, error: { message: 'Row not found' } };
    },
    async then(resolve, reject) {
      try {
        let rows = applyFilters(db[table] || [], state.filters);
        if (state.orderBy) {
          rows = rows.slice().sort((left, right) => {
            const a = left[state.orderBy.key];
            const b = right[state.orderBy.key];
            if (a === b) return 0;
            return state.orderBy.ascending ? (a > b ? 1 : -1) : (a > b ? -1 : 1);
          });
        }
        resolve({
          data: rows.map((row) => decorateRow(table, row, state.selectCols)),
          error: null
        });
      } catch (error) {
        reject(error);
      }
    },
    insert(payload) {
      const rows = Array.isArray(payload) ? payload : [payload];
      const inserted = rows.map((row) => {
        const record = {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...clone(row)
        };
        db[table].push(record);
        return record;
      });
      return {
        select() {
          return {
            async single() {
              return { data: clone(inserted[0]), error: null };
            }
          };
        }
      };
    },
    update(payload) {
      const updateFilters = [...state.filters];
      const chain = {
        eq(key, value) {
          updateFilters.push({ key, value });
          return chain;
        },
        select() {
          return {
            async single() {
              const rows = applyFilters(db[table] || [], updateFilters);
              const target = rows[0];
              if (!target) {
                return { data: null, error: { message: 'Row not found' } };
              }
              Object.assign(target, payload, { updated_at: new Date().toISOString() });
              return { data: clone(target), error: null };
            }
          };
        }
      };
      return chain;
    },
    delete() {
      const deleteFilters = [];
      return {
        async eq(key, value) {
          deleteFilters.push({ key, value });
          const rows = db[table] || [];
          const target = rows.find((row) =>
            deleteFilters.every((filter) => String(row[filter.key]) === String(filter.value))
          );
          if (!target) {
            return { error: null };
          }

          const idsToDelete = new Set();
          const stack = [target.id];
          while (stack.length > 0) {
            const currentId = stack.pop();
            if (!currentId || idsToDelete.has(currentId)) continue;
            idsToDelete.add(currentId);
            rows.forEach((row) => {
              if (row.parent_comment_id === currentId) {
                stack.push(row.id);
              }
            });
          }

          db[table] = rows.filter((row) => !idsToDelete.has(row.id));
          return { error: null };
        }
      };
    }
  };

  return query;
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'server-only') {
    return {};
  }

  if (request === '@/lib/supabaseAdmin' || request.endsWith('/lib/supabaseAdmin')) {
    return {
      supabaseAdmin: {
        from(table) {
          return createQuery(table);
        },
        auth: {
          admin: {
            async getUserById(userId) {
              const names = {
                [OWNER_ID]: { full_name: 'Project Owner' },
                [CLIENT_ID]: { full_name: 'Shared Client' }
              };
              return {
                data: names[userId]
                  ? { user: { id: userId, user_metadata: names[userId] } }
                  : null,
                error: null
              };
            }
          }
        }
      }
    };
  }

  if (request === '@/lib/auth' || request.endsWith('/lib/auth')) {
    return {
      async verifyAuth(req) {
        const authHeader = req.headers.get('authorization') || '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        return { userId: token || null };
      }
    };
  }

  if (request === '@/lib/shareAccess' || request.endsWith('/lib/shareAccess')) {
    return {
      async resolveAccessContext(req, projectId) {
        if (projectId !== PROJECT_ID) return null;
        const authHeader = req.headers.get('authorization') || '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (token === OWNER_ID) {
          return { source: 'user', role: 'owner', userId: OWNER_ID };
        }
        if (token === CLIENT_ID) {
          return { source: 'user', role: 'viewer', userId: CLIENT_ID };
        }
        return null;
      },
      roleCanAccess(role) {
        return ['owner', 'editor', 'commenter', 'viewer'].includes(role);
      },
      roleCanReview(role) {
        return ['owner', 'editor', 'commenter', 'viewer'].includes(role);
      },
      roleCanModify(role) {
        return role === 'owner' || role === 'editor';
      }
    };
  }

  if (request === '@/lib/validation' || request.endsWith('/lib/validation')) {
    return {
      isUuid(value) {
        return typeof value === 'string' && value.length >= 36;
      }
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

async function json(response) {
  return response.json();
}

async function main() {
  const route = require('../app/api/comments/route');

  const topLevelReq = new Request('http://localhost/api/comments', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${CLIENT_ID}`,
      'x-actor-id': CLIENT_ID
    },
    body: JSON.stringify({
      version_id: VERSION_ID,
      time_seconds: 12.4,
      text: 'First client comment'
    })
  });

  const topLevelResp = await route.POST(topLevelReq);
  const topLevelBody = await json(topLevelResp);
  assert.strictEqual(topLevelResp.status, 201, 'client top-level comment in review should succeed');
  const clientCommentId = topLevelBody.comment.id;

  db.versions[0].status = 'review_completed';

  const forbiddenTopLevelReq = new Request('http://localhost/api/comments', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${CLIENT_ID}`,
      'x-actor-id': CLIENT_ID
    },
    body: JSON.stringify({
      version_id: VERSION_ID,
      time_seconds: 20,
      text: 'Late comment'
    })
  });
  const forbiddenTopLevelResp = await route.POST(forbiddenTopLevelReq);
  assert.strictEqual(forbiddenTopLevelResp.status, 403, 'client top-level comment after review_completed must be blocked');

  const ownerReplyReq = new Request('http://localhost/api/comments', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${OWNER_ID}`,
      'x-actor-id': OWNER_ID
    },
    body: JSON.stringify({
      version_id: VERSION_ID,
      time_seconds: 12.4,
      text: 'Owner reply',
      parent_comment_id: clientCommentId
    })
  });
  const ownerReplyResp = await route.POST(ownerReplyReq);
  const ownerReplyBody = await json(ownerReplyResp);
  assert.strictEqual(ownerReplyResp.status, 201, 'owner reply after review_completed should succeed');
  const ownerReplyId = ownerReplyBody.comment.id;

  const clientReplyToOwnerReq = new Request('http://localhost/api/comments', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${CLIENT_ID}`,
      'x-actor-id': CLIENT_ID
    },
    body: JSON.stringify({
      version_id: VERSION_ID,
      time_seconds: 12.4,
      text: 'Client follow-up',
      parent_comment_id: ownerReplyId
    })
  });
  const clientReplyToOwnerResp = await route.POST(clientReplyToOwnerReq);
  assert.strictEqual(clientReplyToOwnerResp.status, 201, 'client reply to owner response should succeed');

  const forbiddenReplyReq = new Request('http://localhost/api/comments', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${CLIENT_ID}`,
      'x-actor-id': CLIENT_ID
    },
    body: JSON.stringify({
      version_id: VERSION_ID,
      time_seconds: 12.4,
      text: 'Client reply to original',
      parent_comment_id: clientCommentId
    })
  });
  const forbiddenReplyResp = await route.POST(forbiddenReplyReq);
  assert.strictEqual(forbiddenReplyResp.status, 403, 'client reply to non-owner response should be blocked');

  const patchReq = new Request('http://localhost/api/comments', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${CLIENT_ID}`,
      'x-actor-id': CLIENT_ID
    },
    body: JSON.stringify({
      id: clientCommentId,
      text: 'Edited after completion'
    })
  });
  const patchResp = await route.PATCH(patchReq);
  assert.strictEqual(patchResp.status, 403, 'client edit after review_completed should be blocked');

  const deleteReq = new Request(`http://localhost/api/comments?id=${encodeURIComponent(clientCommentId)}`, {
    method: 'DELETE',
    headers: {
      'authorization': `Bearer ${CLIENT_ID}`,
      'x-actor-id': CLIENT_ID
    }
  });
  const deleteResp = await route.DELETE(deleteReq);
  assert.strictEqual(deleteResp.status, 403, 'client delete after review_completed should be blocked');

  console.log('comment review rules test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
