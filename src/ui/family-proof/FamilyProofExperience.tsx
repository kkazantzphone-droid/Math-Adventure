import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  createFamilyProof,
  submitFamilyProof,
} from '../../application/family-proof';
import type { ProofFamilyId } from '../../application/family-proof';
import { getPrototypeCopy } from '../../presentation/localisation';
import type { LanguagePreferences } from '../../presentation/localisation';
import type { SpeechController } from '../../presentation/speech/controller';
import { buildUtterancePlan } from '../../presentation/speech/plans';
import { SpeechControls } from '../speech/SpeechControls';
import { encodeProofAnswer } from './answers';
import { FamilyProofScreen } from './FamilyProofScreen';
import type { ProofFeedback } from './FamilyProofScreen';
import type { FamilyProofOptions } from './options';
import '../prototype/prototype.css';
import './family-proof.css';

/** Transient developer proof only, with stateless application calls and no attempt/evidence store. */
export function FamilyProofExperience({
  options,
  preferences,
  speech,
}: {
  readonly options: FamilyProofOptions;
  readonly preferences: LanguagePreferences;
  readonly speech?: SpeechController;
}) {
  const [familyId, setFamilyId] = useState(options.familyId);
  const [seedHex, setSeedHex] = useState(options.seedHex);
  const [generated, setGenerated] = useState(() =>
    createFamilyProof(options.familyId, options.seedHex),
  );
  const [response, setResponse] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<readonly string[]>([]);
  const [hintVisible, setHintVisible] = useState(false);
  const [unitIndex, setUnitIndex] = useState(-1);
  const [feedback, setFeedback] = useState<ProofFeedback>('none');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousFamily = useRef(familyId);
  const snapshot = useSyncExternalStore(
    (listener) => speech?.subscribe(listener) ?? (() => undefined),
    () => speech?.snapshot() ?? null,
    () => speech?.snapshot() ?? null,
  );
  const proof = generated.ok ? generated.value : null;
  useEffect(() => {
    speech?.cancel();
    return () => speech?.cancel();
  }, [speech, preferences, familyId]);
  useEffect(() => {
    if (previousFamily.current !== familyId) headingRef.current?.focus();
    previousFamily.current = familyId;
  }, [familyId]);
  function retry() {
    speech?.cancel();
    setResponse('');
    setSelectedClasses([]);
    setHintVisible(false);
    setUnitIndex(-1);
    setFeedback('none');
  }
  function replay(nextFamily: ProofFamilyId = familyId) {
    retry();
    setFamilyId(nextFamily);
    setGenerated(createFamilyProof(nextFamily, seedHex));
  }
  return (
    <FamilyProofScreen
      proof={proof}
      familyId={familyId}
      seedHex={seedHex}
      preferences={preferences}
      response={response}
      selectedClasses={selectedClasses}
      hintVisible={hintVisible}
      unitIndex={unitIndex}
      feedback={feedback}
      {...(options.textScale === 200 ? { textScale: 200 as const } : {})}
      headingRef={headingRef}
      speechControls={
        speech !== undefined && snapshot !== null ? (
          <SpeechControls
            speech={speech}
            snapshot={snapshot}
            plan={buildUtterancePlan(
              'childInstructions',
              preferences.numberSpeechLocale,
            )}
            copy={getPrototypeCopy(preferences.uiLocale)}
          />
        ) : null
      }
      onFamily={replay}
      onSeed={setSeedHex}
      onReplay={() => replay()}
      onResponse={(value) => {
        speech?.cancel();
        setResponse(value);
        setFeedback('none');
      }}
      onClass={(classId, selected) => {
        speech?.cancel();
        setSelectedClasses((previous) =>
          selected
            ? [...previous, classId]
            : previous.filter((id) => id !== classId),
        );
        setFeedback('none');
      }}
      onHint={() => {
        speech?.cancel();
        setHintVisible(true);
      }}
      onSubmit={() => {
        speech?.cancel();
        if (proof === null) {
          setFeedback('unavailable');
          return;
        }
        if (
          familyId === 'geometry.quadrilateral' &&
          selectedClasses.length === 0
        ) {
          setFeedback('selection');
          return;
        }
        const result = submitFamilyProof(
          proof.replay,
          encodeProofAnswer(familyId, response, selectedClasses),
        );
        setFeedback(
          !result.ok
            ? 'unavailable'
            : result.value.correct
              ? 'correct'
              : 'retry',
        );
      }}
      onRetry={retry}
      onNextUnit={() => {
        speech?.cancel();
        setUnitIndex((previous) =>
          Math.min(previous + 1, proof?.units?.length ?? 0),
        );
      }}
      onStartUnits={() => {
        speech?.cancel();
        setUnitIndex(-1);
      }}
    />
  );
}
