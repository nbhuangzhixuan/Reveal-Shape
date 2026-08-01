import { useEffect, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import '@xyflow/react/dist/style.css'
import { useSettings } from './hooks/useSettings'
import { usePlanGenerator } from './hooks/usePlanGenerator'
import { TaskInput } from './components/TaskInput'
import { PlanView } from './components/PlanView'
import { LoadingState } from './components/LoadingState'
import { SettingsPanel } from './components/SettingsPanel'
import { Sidebar } from './components/Sidebar'
import { UnderstandingFlow } from './components/understanding/UnderstandingFlow'
import { RestructureFlow } from './components/restructure/RestructureFlow'
import { PhaseStepper, type Phase } from './components/PhaseStepper'

function App() {
  const { settings, loaded, save, hasActiveApiKey } = useSettings()
  const {
    plan, plans, activePlanId, isGenerating, error, isRestored,
    startUnderstanding, answerCurrentQuestion, editUnderstandingField,
    refineUnderstandingDraft, confirmUnderstanding,
    editRestructureField, refineRestructureDraft, confirmRestructure, confirmTree,
    frontierCount, confirmFrontier, lastExpandedIds, refineFrontier, editNode, rewriteNode,
    undo, redo, canUndo, canRedo,
    deleteNode, addSiblingNode, setNodeImage, moveKeyPointNode,
    selectPlan, deselectPlan, deletePlan
  } = usePlanGenerator()
  const [settingsOpen, setSettingsOpen] = useState(false)
  // 'idle' = 还没有选中的计划（启动后、新建、删除后）。此时主区显示建计划的输入框，
  // 阶段条三个都不高亮——不要错误地指向某个阶段（之前用 'present' 表达空状态，
  // 导致新建计划时阶段条显示"3 呈现"）
  const [phase, setPhase] = useState<Phase>('idle')

  const showOnboardingSettings = loaded && !hasActiveApiKey
  const showSettings = settingsOpen || showOnboardingSettings

  // 选中的计划变了，或者计划自己的阶段真的推进了（比如确认树后从 restructure 跳到 present），导航跟着走
  useEffect(() => {
    if (plan) setPhase(plan.phase)
  }, [plan?.id, plan?.phase])

  const handleNewPlan = () => {
    deselectPlan()
    setPhase('idle')
  }

  // 删掉的如果正好是当前打开的计划，跟"新建计划"一样把导航切回空闲空状态，
  // 否则 phase 会停在被删计划生前所在的阶段（比如 understand），但 plan 已经是 null，什么都渲染不出来
  const handleDeletePlan = (id: string) => {
    deletePlan(id)
    if (id === activePlanId) setPhase('idle')
  }

  return (
    <div className="flex h-screen w-screen bg-white">
      <Sidebar
        plans={plans}
        activePlanId={activePlanId}
        isGenerating={isGenerating}
        onSelectPlan={selectPlan}
        onNewPlan={handleNewPlan}
        onDeletePlan={handleDeletePlan}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
          <span className="text-sm font-semibold text-neutral-800">thinkppt</span>
          <button onClick={() => setSettingsOpen(true)} className="text-neutral-400 transition hover:text-neutral-700">
            <SettingsIcon size={18} />
          </button>
        </header>

        <PhaseStepper current={phase} onSelect={setPhase} />

        <main className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-10">
          {error && (
            <div className="mb-4 w-full max-w-xl rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          {phase === 'idle' && (
            <>
              {!isRestored && (
                <div className="w-full max-w-xl"><LoadingState /></div>
              )}

              {isRestored && !plan && !isGenerating && (
                <TaskInput onSubmit={startUnderstanding} isGenerating={isGenerating} />
              )}

              {isRestored && isGenerating && !plan && (
                <div className="w-full max-w-xl"><LoadingState /></div>
              )}
            </>
          )}

          {phase === 'understand' && plan && (
            <UnderstandingFlow
              plan={plan}
              isGenerating={isGenerating}
              onAnswer={answerCurrentQuestion}
              onEditField={editUnderstandingField}
              onRefine={refineUnderstandingDraft}
              onConfirm={confirmUnderstanding}
              onEditRestructureField={editRestructureField}
              onRefineRestructure={refineRestructureDraft}
              onConfirmRestructure={confirmRestructure}
            />
          )}

          {phase === 'restructure' && plan && (
            <RestructureFlow
              plan={plan}
              isGenerating={isGenerating}
              onEditField={editRestructureField}
              onRefine={refineRestructureDraft}
              onConfirmDraft={confirmRestructure}
              onEditNode={editNode}
              frontierCount={frontierCount}
              onConfirmFrontier={confirmFrontier}
              onConfirmTree={confirmTree}
              hasFreshLayer={lastExpandedIds.length > 0}
              onRefineFrontier={refineFrontier}
              onMoveKeyPointNode={moveKeyPointNode}
              onRewriteNode={rewriteNode}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          )}

          {phase === 'present' && isRestored && plan && (
            <PlanView
              plan={plan}
              onReset={deselectPlan}
              onEditNode={editNode}
              onDeleteNode={deleteNode}
              onAddSiblingNode={addSiblingNode}
              onSetNodeImage={setNodeImage}
              onMoveKeyPointNode={moveKeyPointNode}
            />
          )}
        </main>
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={save}
          onClose={() => setSettingsOpen(false)}
          dismissible={!showOnboardingSettings || settingsOpen}
        />
      )}
    </div>
  )
}

export default App
