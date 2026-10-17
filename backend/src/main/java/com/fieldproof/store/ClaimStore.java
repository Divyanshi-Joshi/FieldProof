package com.fieldproof.store;

import com.fieldproof.api.dto.ClaimBundle;
import java.util.List;
import java.util.Optional;

/**
 * Storage interface for Claims as specified in docs/DAY3 §T3.2.
 * Allows switching between Local file store, memory store, and GCS object store.
 */
public interface ClaimStore {
    ClaimBundle create(ClaimBundle bundle);
    Optional<ClaimBundle> get(String claimId);
    ClaimBundle update(ClaimBundle bundle);
    List<ClaimBundle> listAll();
    void clear();
}
