/**
 * Project stage
 */
import React from 'react'
import PT from 'prop-types'
import _ from 'lodash'
import uncontrollable from 'uncontrollable'

import { formatNumberWithCommas } from '../../../helpers/format'
import { getPhaseActualData } from '../../../helpers/projectHelper'
import { PROJECT_ATTACHMENTS_FOLDER } from '../../../config/constants'

import PhaseCard from './PhaseCard'
import ProjectStageTabs from './ProjectStageTabs'
import EditProjectForm from './EditProjectForm'
import PhaseFeed from './PhaseFeed'
import ProductTimelineContainer from '../containers/ProductTimelineContainer'
import { phaseFeedHOC } from '../containers/PhaseFeedHOC'
import spinnerWhileLoading from '../../../components/LoadingSpinner'

const enhance = spinnerWhileLoading(props => !props.processing)
const EnhancedEditProjectForm = enhance(EditProjectForm)

/**
 * Format PhaseCard attr property
 *
 * @param {Object} phase            phase
 * @param {Array}  productTemplates product templates
 * @param {Object} feed             phase feed object
 *
 * @returns {Object} PhaseCard attr property
 */
function formatPhaseCardAttr(phase, phaseIndex, productTemplates, feed, timeline) {
  // NOTE so far one phase always has 1 product
  // but as in the future this may be changed, we work with products as an array
  const product = _.get(phase, 'products[0]')
  const { status } = phase
  const productTemplate = _.find(productTemplates, { id: product.templateId })
  const budget = phase.budget || 0
  const price = `$${formatNumberWithCommas(budget)}`
  const icon = _.get(productTemplate, 'icon')
  const title = phase.name

  const {
    startDate,
    endDate,
    duration: plannedDuration,
    progress: progressInPercent,
  } = getPhaseActualData(phase, timeline)

  const duration = `${plannedDuration} day${plannedDuration !== 1 ? 's' : ''}`
  let startEndDates = startDate ? `${startDate.format('MMM D')}` : ''
  // appends end date to the start date only if end date is greater than start date
  startEndDates += startDate && endDate && endDate.diff(startDate, 'days') > 0 ? `-${endDate.format('MMM D')}` : ''
  // extracts the start date's month string plus white space
  const monthStr = startEndDates.substr(0, 4)
  // replaces the second occurrence of the month part i.e. removes the end date's month part
  startEndDates = startEndDates.lastIndexOf(monthStr) !== 0 ? startEndDates.replace(`-${monthStr}`, '-') : startEndDates

  const actualPrice = phase.spentBudget
  let paidStatus = 'Quoted'
  if (actualPrice && actualPrice === budget) {
    paidStatus = 'Paid in full'
  } else if (actualPrice && actualPrice < budget) {
    paidStatus = `$${formatNumberWithCommas(budget - actualPrice)} remaining`
  }

  const postsCount = _.get(feed, 'posts.length')
  const postsWord = postsCount === 1 ? 'post' : 'posts'
  const posts = _.isNumber(postsCount) ? `${postsCount} ${postsWord}` : null

  return {
    icon,
    title,
    duration,
    startEndDates,
    price,
    paidStatus,
    status,
    posts,
    phaseIndex,
    phase,
    progressInPercent
  }
}

class ProjectStage extends React.Component{
  constructor(props) {
    super(props)

    this.removeProductAttachment = this.removeProductAttachment.bind(this)
    this.updateProductAttachment = this.updateProductAttachment.bind(this)
    this.addProductAttachment = this.addProductAttachment.bind(this)
  }

  removeProductAttachment(attachmentId) {
    const { project, phase, removeProductAttachment } = this.props
    const product = _.get(phase, 'products[0]')

    removeProductAttachment(project.id, phase.id, product.id, attachmentId)
  }

  updateProductAttachment(attachmentId, updatedAttachment) {
    const { project, phase, updateProductAttachment } = this.props
    const product = _.get(phase, 'products[0]')

    updateProductAttachment(project.id, phase.id, product.id, attachmentId, updatedAttachment)
  }

  addProductAttachment(attachment) {
    const { project, phase, addProductAttachment } = this.props
    const product = _.get(phase, 'products[0]')

    addProductAttachment(project.id, phase.id, product.id, attachment)
  }

  render() {
    const {
      activeTab,
      phase,
      phaseIndex,
      project,
      productTemplates,
      currentMemberRole,
      isProcessing,
      isSuperUser,
      isManageUser,
      updateProduct,
      fireProductDirty,
      fireProductDirtyUndo,
      onTabClick,
      deleteProjectPhase,

      // comes from phaseFeedHOC
      currentUser,
      feed,
      onLoadMoreComments,
      onAddNewComment,
      isAddingComment,
      onDeleteMessage,
      allMembers,
      onSaveMessage,
      timeline,
    } = this.props

    // NOTE even though in store we keep products as an array,
    // so far we always have only one product per phase, so will display only one
    const productTemplate = _.find(productTemplates, { id: _.get(phase, 'products[0].templateId') })
    const product = _.get(phase, 'products[0]')
    const sections = _.get(productTemplate, 'template.questions', [])

    const attachmentsStorePath = `${PROJECT_ATTACHMENTS_FOLDER}/${project.id}/phases/${phase.id}/products/${product.id}`

    const hasTimeline = !!timeline
    const defaultActiveTab = hasTimeline ? 'timeline' : 'posts'
    const currentActiveTab = activeTab ? activeTab : defaultActiveTab

    return (
      <PhaseCard
        attr={formatPhaseCardAttr(phase, phaseIndex, productTemplates, feed, timeline)}
        projectStatus={project.status}
        isManageUser={isManageUser}
        deleteProjectPhase={() => deleteProjectPhase(project.id, phase.id)}
        timeline={timeline}
      >
        <div>
          <ProjectStageTabs
            activeTab={currentActiveTab}
            onTabClick={onTabClick}
            isSuperUser={isSuperUser}
            isManageUser={isManageUser}
            hasTimeline={hasTimeline}
          />

          {currentActiveTab === 'timeline' &&
            <ProductTimelineContainer product={product} />
          }

          {currentActiveTab === 'posts' &&
            <PhaseFeed
              user={currentUser}
              currentUser={currentUser}
              feed={feed}
              onLoadMoreComments={onLoadMoreComments}
              onAddNewComment={onAddNewComment}
              isAddingComment={isAddingComment}
              onDeleteMessage={onDeleteMessage}
              allMembers={allMembers}
              onSaveMessage={onSaveMessage}
            />
          }

          {currentActiveTab === 'specification' &&
            <div className="two-col-content content">
              <EnhancedEditProjectForm
                project={product}
                sections={sections}
                isEdittable={isSuperUser || !!currentMemberRole}
                submitHandler={(model) => updateProduct(project.id, phase.id, product.id, model)}
                saving={isProcessing}
                fireProjectDirty={(values) => fireProductDirty(phase.id, product.id, values)}
                fireProjectDirtyUndo= {fireProductDirtyUndo}
                addAttachment={this.addProductAttachment}
                updateAttachment={this.updateProductAttachment}
                removeAttachment={this.removeProductAttachment}
                attachmentsStorePath={attachmentsStorePath}
                canManageAttachments={!!currentMemberRole}
              />
            </div>
          }
        </div>
      </PhaseCard>
    )
  }
}

ProjectStage.defaultProps = {
  activeTab: '',
  currentMemberRole: null,
}

ProjectStage.propTypes = {
  activeTab: PT.string,
  onTabClick: PT.func.isRequired,
  project: PT.object.isRequired,
  currentMemberRole: PT.string,
  isProcessing: PT.bool.isRequired,
  isSuperUser: PT.bool.isRequired,
  updateProduct: PT.func.isRequired,
  fireProductDirty: PT.func.isRequired,
  fireProductDirtyUndo: PT.func.isRequired,
  addProductAttachment: PT.func.isRequired,
  updateProductAttachment: PT.func.isRequired,
  removeProductAttachment: PT.func.isRequired,
  deleteProjectPhase: PT.func.isRequired,
}

const ProjectStageUncontrollable = uncontrollable(ProjectStage, {
  activeTab: 'onTabClick',
})

export default phaseFeedHOC(ProjectStageUncontrollable)
