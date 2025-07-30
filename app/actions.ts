"use server";

import { Config, configSchema, explanationsSchema, Result } from "@/lib/types";
import { openai } from "@ai-sdk/openai";
import { sql } from "@vercel/postgres";
import { generateObject } from "ai";
import { z } from "zod";

export const generateQuery = async (input: string) => {
  "use server";
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      system: `You are a SQL (postgres) and data visualization expert. Your job is to help the user write a SQL query to retrieve the data they need. The table schema is as follows:

      companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    dot_number int4,
    email TEXT,
    power_units int4,
    city varchar,
    state varchar
    );

    analytics_shipper_events (
   id SERIAL PRIMARY KEY,
   analytics_company_id int8,
   type varchar,
   company_id int8,
   search_city_id int8,
   search_freight_ids int8,
   search_truck_type_ids int8,
   search_shipment_type_ids int8,
   search_specialized_service_ids int8
   );

    analytics_companies (
   id SERIAL PRIMARY KEY, 
   name varchar,
   industry_id int8
   );

    analytics_industries (
   id SERIAL PRIMARY KEY, 
   name varchar
   );

    cities (
   id SERIAL PRIMARY KEY, 
   name varchar, 
   state_code varchar
   );

    freights (
   id SERIAL PRIMARY KEY, 
   name varchar 
   );

    truck_types (
   id SERIAL PRIMARY KEY, 
   name varchar 
   );

    shipment_types (
   id SERIAL PRIMARY KEY, 
   name varchar 
   );
 
    specialized_services (
   id SERIAL PRIMARY KEY, 
   name varchar 
   );

    Only retrieval queries are allowed.

    When relevant, use joins to connect related tables (example 'analytics_shipper_events.search_city_id' joins to 'cities.id', or 'analytics_companies.industry_id' joins to 'analytics_industries.id').

    For string fields, use the ILIKE operator and convert both the search term and the field to lowercase using LOWER() for case-insensitive matching. For example: LOWER(city) ILIKE LOWER('%search_term%').
    
    EVERY QUERY SHOULD RETURN QUANTITATIVE DATA THAT CAN BE PLOTTED ON A CHART! There should always be at least two columns. If the user asks for a single column, return the column and the count of the column. If the user asks for a rate, return the rate as a decimal. For example, 0.1 would be 10%.

    Avoid NULL values in output. Use COUNT, GROUP BY, and JOINs as needed to generate meaningful insights from the schema above.
    `,
      prompt: `Generate the query necessary to retrieve the data the user wants: ${input}`,
      schema: z.object({
        query: z.string(),
      }),
    });
    return result.object.query;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to generate query");
  }
};

export const runGenerateSQLQuery = async (query: string) => {
  "use server";
  // Check if the query is a SELECT statement
  if (
    !query.trim().toLowerCase().startsWith("select") ||
    query.trim().toLowerCase().includes("drop") ||
    query.trim().toLowerCase().includes("delete") ||
    query.trim().toLowerCase().includes("insert") ||
    query.trim().toLowerCase().includes("update") ||
    query.trim().toLowerCase().includes("alter") ||
    query.trim().toLowerCase().includes("truncate") ||
    query.trim().toLowerCase().includes("create") ||
    query.trim().toLowerCase().includes("grant") ||
    query.trim().toLowerCase().includes("revoke")
  ) {
    throw new Error("Only SELECT queries are allowed");
  }

  let data: any;
  try {
    data = await sql.query(query);
  } catch (e: any) {
    if (e.message.includes('relation "companies" does not exist')) {
      console.log(
        "Table does not exist, creating and seeding it with dummy data now...",
      );
      // throw error
      throw Error("Table does not exist");
    } else {
      throw e;
    }
  }

  return data.rows as Result[];
};

export const explainQuery = async (input: string, sqlQuery: string) => {
  "use server";
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        explanations: explanationsSchema,
      }),
      system: `You are a SQL (postgres) expert. Your job is to explain to the user write a SQL query you wrote to retrieve the data they asked for. The table schema is as follows:
      
      companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    dot_number int4,
    email TEXT,
    power_units int4,
    city varchar,
    state varchar
    );

    analytics_shipper_events (
   id SERIAL PRIMARY KEY,
   analytics_company_id int8,
   type varchar,
   company_id int8,
   search_city_id int8,
   search_freight_ids int8,
   search_truck_type_ids int8,
   search_shipment_type_ids int8,
   search_specialized_service_ids int8
   );

    analytics_companies (
   id SERIAL PRIMARY KEY, 
   name varchar,
   industry_id int8
   );

    analytics_industries (
   id SERIAL PRIMARY KEY, 
   name varchar
   );

    cities (
   id SERIAL PRIMARY KEY, 
   name varchar, 
   state_code varchar
   );

    freights (
   id SERIAL PRIMARY KEY, 
   name varchar 
   );

    truck_types (
   id SERIAL PRIMARY KEY, 
   name varchar 
   );

    shipment_types (
   id SERIAL PRIMARY KEY, 
   name varchar 
   );

    specialized_services (
   id SERIAL PRIMARY KEY, 
   name varchar 
   );

    When you explain, break the query into unique sections (for example: "SELECT *", "FROM companies", "WHERE city = 'Chicago'") and explain each part concisely, especially JOINs, filters, and GROUP BY logic. If a section doesn't need an explanation, include it with an empty explanation.

    `,
      prompt: `Explain the SQL query you generated to retrieve the data the user wanted. Assume the user is not an expert in SQL. Break down the query into steps. Be concise.

      User Query:
      ${input}

      Generated SQL Query:
      ${sqlQuery}`,
    });
    return result.object;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to generate query");
  }
};

export const generateChartConfig = async (
  results: Result[],
  userQuery: string,
) => {
  "use server";
  const system = `You are a data visualization expert. `;

  try {
    const { object: config } = await generateObject({
      model: openai("gpt-4o"),
      system,
      prompt: `Given the following data from a SQL query result, generate the chart config that best visualises the data and answers the users query.
      For multiple groups use multi-lines.

      Here is an example complete config:
      export const chartConfig = {
        type: "pie",
        xKey: "month",
        yKeys: ["sales", "profit", "expenses"],
        colors: {
          sales: "#4CAF50",    // Green for sales
          profit: "#2196F3",   // Blue for profit
          expenses: "#F44336"  // Red for expenses
        },
        legend: true
      }

      User Query:
      ${userQuery}

      Data:
      ${JSON.stringify(results, null, 2)}`,
      schema: configSchema,
    });

    const colors: Record<string, string> = {};
    config.yKeys.forEach((key, index) => {
      colors[key] = `hsl(var(--chart-${index + 1}))`;
    });

    const updatedConfig: Config = { ...config, colors };
    return { config: updatedConfig };
  } catch (e) {
    // @ts-expect-errore
    console.error(e.message);
    throw new Error("Failed to generate chart suggestion");
  }
};
