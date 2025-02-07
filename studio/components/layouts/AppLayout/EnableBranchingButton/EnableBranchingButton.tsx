import { Button, IconGitBranch } from 'ui'

import { useSelectedOrganization } from 'hooks'
import { useAppUiStateSnapshot } from 'state/app'
import BranchingWaitlistPopover from './BranchingWaitlistPopover'

import { OPT_IN_TAGS } from 'lib/constants'

interface EnableBranchingButtonProps {
  isNewNav?: boolean
}

const EnableBranchingButton = ({ isNewNav = false }: EnableBranchingButtonProps) => {
  const snap = useAppUiStateSnapshot()
  const selectedOrg = useSelectedOrganization()

  const hasAccessToBranching =
    selectedOrg?.opt_in_tags?.includes(OPT_IN_TAGS.PREVIEW_BRANCHES) ?? false

  if (!hasAccessToBranching) {
    return <BranchingWaitlistPopover isNewNav={isNewNav} />
  }

  return (
    <Button
      type={isNewNav ? 'default' : 'text'}
      icon={<IconGitBranch strokeWidth={1.5} />}
      onClick={() => snap.setShowEnableBranchingModal(true)}
    >
      Enable branching
    </Button>
  )
}

export default EnableBranchingButton
