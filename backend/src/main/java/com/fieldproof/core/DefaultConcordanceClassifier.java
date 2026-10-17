package com.fieldproof.core;

import org.springframework.stereotype.Component;

/**
 * Deterministic classifier implementing CoreContracts.ConcordanceClassifier
 * calling ConcordanceTable.evaluate.
 */
@Component
public class DefaultConcordanceClassifier implements CoreContracts.ConcordanceClassifier {

    @Override
    public ConcordanceTable.ConcordanceResult classify(CoreContracts.ConcordanceInputs inputs) {
        return ConcordanceTable.evaluate(
                inputs.integrityOk(),
                inputs.abstained(),
                inputs.photoBand(),
                inputs.damageType(),
                inputs.indexPays(),
                inputs.satelliteStress(),
                inputs.dryspellOverlapsCriticalStage(),
                inputs.plotLevelRainLow()
        );
    }
}
