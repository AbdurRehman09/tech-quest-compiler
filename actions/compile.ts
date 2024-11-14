"use server";

import axios from "axios";

export async function compileCode(requestData: any) {
  const endpoint = "https://emkc.org/api/v2/piston/execute";

  try {
    const response = await axios.post(endpoint, {
      ...requestData,
      run_timeout: 10000,
      compile_memory_limit: -1,
      run_memory_limit: -1
    });

    return response.data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
