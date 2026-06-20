import { createInterface } from "node:readline/promises"

export const promptText = async (question: string, def = ""): Promise<string> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = (await rl.question(`${question}${def ? ` (${def})` : ""}: `)).trim()
    return answer || def
  } finally {
    rl.close()
  }
}

export const promptConfirm = async (question: string, def = true): Promise<boolean> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = (await rl.question(`${question} (${def ? "Y/n" : "y/N"}) `)).trim().toLowerCase()
    if (!answer) return def
    return answer === "y" || answer === "yes"
  } finally {
    rl.close()
  }
}
