import * as core from '@actions/core'
import * as exec from '@actions/exec'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const expectedAuthor = 'dependabot[bot]'
    const branches = ['1.0.x', '1.1.x', 'main']

    for (let i = 1; i < branches.length; i++) {
      const previousBranch = branches[i - 1]
      const currentBranch = branches[i]

      await exec.exec('git', [
        'worktree',
        'add',
        '-b',
        previousBranch,
        `../${previousBranch}`,
        `origin/${previousBranch}`
      ])
      await exec.exec('git', [
        'worktree',
        'add',
        '-b',
        currentBranch,
        `../${currentBranch}`,
        `origin/${currentBranch}`
      ])

      let gitLogOutput = ''
      let gitLogError = ''
      const options: exec.ExecOptions = {
        listeners: {
          stdout: (data: Buffer) => {
            gitLogOutput += data.toString()
          },
          stderr: (data: Buffer) => {
            gitLogError += data.toString()
          }
        }
      }

      await exec.exec(
        'git',
        [
          'log',
          '--no-merges',
          previousBranch,
          `^${currentBranch}`,
          `--format='%ae'`
        ],
        options
      )
      core.info('gitLogOutput = ' + gitLogOutput)
      core.info('gitLogError = ' + gitLogError)
      const authors = new Set<string>(gitLogOutput.split('\n'))
      if (authors.size == 1 && authors.has(expectedAuthor)) {
        core.info('Authors contains only expected author ' + authors)
      }
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
