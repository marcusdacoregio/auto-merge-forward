import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const fromAuthor = 'marcusdacoregio@gmail.com'
    const branches = ['1.0.x', '1.1.x', 'main']
    const branchesToPush: Array<string> = []

    const originBranch = github.context.ref.split('/')[2]
    for (let branch of branches) {
      if (branch == originBranch) {
        await exec.exec('git', ['fetch', 'origin', branch, '--unshallow'])
        continue
      }
      await exec.exec('git', ['fetch', 'origin', branch])
      await exec.exec('git', ['switch', branch])
      await exec.exec('git', ['switch', '-'])
    }

    for (let i = 1; i < branches.length; i++) {
      const previousBranch = branches[i - 1]
      const currentBranch = branches[i]

      let gitLogOutput = ''
      let gitLogError = ''
      const options: exec.ExecOptions = {
        listeners: {
          stdout: (data: Buffer) => {
            gitLogOutput = data.toString()
          },
          stderr: (data: Buffer) => {
            gitLogError = data.toString()
          }
        }
      }

      await exec.exec(
        'git',
        [
          'log',
          previousBranch,
          `^${currentBranch}`,
          '--format=%ae',
          '--no-merges'
        ],
        options
      )
      core.info('gitLogOutput = ' + gitLogOutput)
      core.info('gitLogError = ' + gitLogError)
      const authorsFromLog = gitLogOutput.split('\n').filter(v => !!v)
      core.info('authors from log ' + authorsFromLog)
      const authors = new Set<string>()
      authors.forEach(author => console.log('author from set ' + author))
      if (authors.size == 1 /* && authors.has(expectedAuthor)*/) {
        core.info('Authors contains only expected author ' + authors)
        core.info(
          `Merging ${previousBranch} into ${currentBranch} using ours strategy`
        )
        exec.exec('git', ['merge', previousBranch, '-s ours'])
        branchesToPush.push(currentBranch)
      }
    }

    const pushCommand: Array<string> = [
      'push',
      '--atomic',
      'origin',
      ...branchesToPush
    ]
    exec.exec('git', pushCommand)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
