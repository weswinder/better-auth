/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { runAdapterTest } from "better-auth/adapters/test";
import { convexTest } from "convex-test";
import { api } from "../component/_generated/api";
import schema from "../component/schema";
import { serialize } from "../component/adapterTest";
import { Adapter } from "better-auth";

export const getAdapter = (t: ReturnType<typeof convexTest>) => async () => {
  return {
    id: "convex",
    create: async (data) => {
      const result = await t.mutation(api.adapterTest.create, {
        ...data,
        data: serialize(data.data),
      });
      return result;
    },
    findOne: async (data) => {
      return t.query(api.adapterTest.findOne, data);
    },
    findMany: async (data) => {
      return t.query(api.adapterTest.findMany, data);
    },
    count: async (data) => {
      return t.query(api.adapterTest.count, data);
    },
    update: async (data) => {
      return t.mutation(api.adapterTest.update, {
        ...data,
        update: serialize(data.update),
      });
    },
    updateMany: async (data) => {
      return t.mutation(api.adapterTest.updateMany, data);
    },
    delete: async (data) => {
      await t.mutation(api.adapterTest.delete, data);
    },
    deleteMany: async (data) => {
      return t.mutation(api.adapterTest.deleteMany, data);
    },
  } satisfies Adapter;
};

describe("convex adapter", async () => {
  const _t = convexTest(schema, import.meta.glob("../component/**/*.*s"));
  await runAdapterTest({
    getAdapter: getAdapter(_t),
    disableTests: {
      CREATE_MODEL: false,
      CREATE_MODEL_SHOULD_ALWAYS_RETURN_AN_ID: false,
      FIND_MODEL: false,
      FIND_MODEL_WITHOUT_ID: false,
      FIND_MODEL_WITH_SELECT: false,
      FIND_MODEL_WITH_MODIFIED_FIELD_NAME: false,
      UPDATE_MODEL: false,
      SHOULD_FIND_MANY: false,
      SHOULD_FIND_MANY_WITH_WHERE: false,
      SHOULD_FIND_MANY_WITH_OPERATORS: false,
      SHOULD_WORK_WITH_REFERENCE_FIELDS: false,
      SHOULD_FIND_MANY_WITH_SORT_BY: false,
      SHOULD_FIND_MANY_WITH_LIMIT: false,
      SHOULD_FIND_MANY_WITH_OFFSET: true, // disabled for now
      SHOULD_UPDATE_WITH_MULTIPLE_WHERE: false,
      DELETE_MODEL: false,
      SHOULD_DELETE_MANY: false,
      SHOULD_NOT_THROW_ON_DELETE_RECORD_NOT_FOUND: false,
      SHOULD_NOT_THROW_ON_RECORD_NOT_FOUND: false,
      SHOULD_FIND_MANY_WITH_CONTAINS_OPERATOR: false,
      SHOULD_SEARCH_USERS_WITH_STARTS_WITH: false,
      SHOULD_SEARCH_USERS_WITH_ENDS_WITH: false,
      SHOULD_PREFER_GENERATE_ID_IF_PROVIDED: true,
    },
  });

  test("should handle lone range operators", async () => {
    const t = convexTest(schema, import.meta.glob("../component/**/*.*s"));
    const adapter = await getAdapter(t)();
    const user = await adapter.create({
      model: "user",
      data: {
        name: "ab",
        email: "a@a.com",
      },
    });
    expect(
      await adapter.findMany({
        model: "user",
        where: [
          {
            field: "name",
            operator: "lt",
            value: "a",
          },
        ],
      })
    ).toEqual([]);
    expect(
      await adapter.findMany({
        model: "user",
        where: [
          {
            field: "name",
            operator: "lte",
            value: "a",
          },
        ],
      })
    ).toEqual([]);
    expect(
      await adapter.findMany({
        model: "user",
        where: [
          {
            field: "name",
            operator: "gt",
            value: "a",
          },
        ],
      })
    ).toEqual([user]);
    expect(
      await adapter.findMany({
        model: "user",
        where: [
          {
            field: "name",
            operator: "gte",
            value: "ab",
          },
        ],
      })
    ).toEqual([user]);
  });

  test("should handle compound indexes that include id field", async () => {
    const t = convexTest(schema, import.meta.glob("../component/**/*.*s"));
    const adapter = await getAdapter(t)();
    const user = await adapter.create({
      model: "user",
      data: {
        name: "foo",
        email: "foo@bar.com",
      },
    });
    expect(
      await adapter.findOne({
        model: "user",
        where: [
          {
            field: "id",
            value: user.id,
          },
          {
            field: "name",
            value: "wrong name",
          },
        ],
      })
    ).toEqual(null);
    expect(
      await adapter.findOne({
        model: "user",
        where: [
          {
            field: "id",
            value: user.id,
          },
          {
            field: "name",
            value: "foo",
          },
        ],
      })
    ).toEqual(user);
    expect(
      await adapter.findOne({
        model: "user",
        where: [
          {
            field: "id",
            value: user.id,
          },
          {
            field: "name",
            value: "foo",
            operator: "lt",
          },
        ],
      })
    ).toEqual(null);
    expect(
      await adapter.findOne({
        model: "user",
        where: [
          {
            field: "id",
            value: user.id,
          },
          {
            field: "name",
            value: "foo",
            operator: "lte",
          },
        ],
      })
    ).toEqual(user);
    expect(
      await adapter.findOne({
        model: "user",
        where: [
          {
            field: "id",
            value: user.id,
          },
          {
            field: "name",
            value: "foo",
            operator: "gt",
          },
        ],
      })
    ).toEqual(null);
    expect(
      await adapter.findOne({
        model: "user",
        where: [
          {
            field: "id",
            value: user.id,
          },
          {
            field: "name",
            value: "foo",
            operator: "gte",
          },
        ],
      })
    ).toEqual(user);
    expect(
      await adapter.findOne({
        model: "user",
        where: [
          {
            field: "id",
            value: user.id,
          },
          {
            field: "name",
            operator: "in",
            value: ["wrong", "name"],
          },
        ],
      })
    ).toEqual(null);
    expect(
      await adapter.findOne({
        model: "user",
        where: [
          {
            field: "id",
            value: user.id,
          },
          {
            field: "name",
            operator: "in",
            value: ["foo"],
          },
        ],
      })
    ).toEqual(user);
  });
  test("should automatically paginate", async () => {
    const t = convexTest(schema, import.meta.glob("../component/**/*.*s"));
    const adapter = await getAdapter(t)();
    for (let i = 0; i < 300; i++) {
      await adapter.create({
        model: "user",
        data: {
          name: `foo${i}`,
          email: `foo${i}@bar.com`,
        },
      });
    }
    // Better Auth defaults to a limit of 100
    expect(
      await adapter.findMany({
        model: "user",
      })
    ).toHaveLength(100);

    // Pagination has a hardcoded numItems max of 200, this tests that it can handle
    // specified limits beyond that
    expect(
      await adapter.findMany({
        model: "user",
        limit: 250,
      })
    ).toHaveLength(250);
    expect(
      await adapter.findMany({
        model: "user",
        limit: 350,
      })
    ).toHaveLength(300);
  });
  test("should handle OR where clauses", async () => {
    const t = convexTest(schema, import.meta.glob("../component/**/*.*s"));
    const adapter = await getAdapter(t)();
    const user = await adapter.create({
      model: "user",
      data: {
        name: "foo",
        email: "foo@bar.com",
      },
    });
    expect(
      await adapter.findOne({
        model: "user",
        where: [
          { field: "name", value: "bar", connector: "OR" },
          { field: "name", value: "foo", connector: "OR" },
        ],
      })
    ).toEqual(user);
  });
  test("should handle count", async () => {
    const t = convexTest(schema, import.meta.glob("../component/**/*.*s"));
    const adapter = await getAdapter(t)();
    await adapter.create({
      model: "user",
      data: {
        name: "foo",
        email: "foo@bar.com",
      },
    });
    await adapter.create({
      model: "user",
      data: {
        name: "bar",
        email: "bar@bar.com",
      },
    });
    expect(
      await adapter.count({
        model: "user",
        where: [{ field: "name", value: "foo" }],
      })
    ).toEqual(1);
  });
  test("should handle queries with no index", async () => {
    const t = convexTest(schema, import.meta.glob("../component/**/*.*s"));
    const adapter = await getAdapter(t)();
    const user = await adapter.create({
      model: "user",
      data: {
        name: "foo",
        email: "foo@bar.com",
        emailVerified: true,
      },
    });
    expect(
      await adapter.findOne({
        model: "user",
        where: [{ field: "emailVerified", value: true }],
      })
    ).toEqual(user);
    expect(
      await adapter.findOne({
        model: "user",
        where: [{ field: "emailVerified", value: false }],
      })
    ).toEqual(null);
  });
});
