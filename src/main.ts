import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const fromAuthor = core.getInput('from-author')
    const branches = core.getInput('branches')
    const mergeStrategy: string = core.getInput('merge-strategy')
    const dryRun: boolean = core.getInput('dry-run') == 'true'
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
      const authors = new Set<string>(authorsFromLog)
      authors.forEach(author => console.log('author from set ' + author))
      if (authors.size == 1 && authors.has(fromAuthor)) {
        core.info(
          `Merging ${previousBranch} into ${currentBranch} using ${mergeStrategy} strategy`
        )
        await exec.exec('git', ['switch', currentBranch])
        await exec.exec('git', ['merge', previousBranch, '-s', mergeStrategy])
        branchesToPush.push(currentBranch)
      }
    }

    if (dryRun) {
      core.info('Dry-run is true, not invoking push this time')
    } else {
      const pushCommand: Array<string> = [
        'push',
        '--atomic',
        'origin',
        ...branchesToPush
      ]
      exec.exec('git', pushCommand)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
