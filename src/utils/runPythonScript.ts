// import { PythonShell } from "python-shell";

// const runPythonScript = async (scriptName: string, args: string[]): Promise<string[]> => {
//   return new Promise((resolve, reject) => {
//     PythonShell.run(
//       scriptName,
//       { args, scriptPath: "node_modules/lastfm-year-scrapper/month" },
//       (err: Error | null, results: string[] | null) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(results || []);
//         }
//       }
//     );
//   });
// };

// export default runPythonScript;

import { PythonShell } from "python-shell";

const runPythonScript = async (scriptName: string, args: string[]): Promise<string[]> => {
  try {
    const results = await PythonShell.run(scriptName, { args, scriptPath: "node_modules/lastfm-year-scrapper/month" });
    return results || [];
  } catch (err) {
    throw err;
  }
};

export default runPythonScript;
