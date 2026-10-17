package com.fieldproof.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldproof.api.dto.ClaimBundle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Robust Local Claim Store storing each claim as a JSON file under storage/claims/{claimId}.json
 * with in-memory fast indexing for low latency.
 */
@Component
public class LocalClaimStore implements ClaimStore {

    private static final Logger log = LoggerFactory.getLogger(LocalClaimStore.class);

    private final Path storageDir;
    private final ObjectMapper objectMapper;
    private final Map<String, ClaimBundle> memoryIndex = new ConcurrentHashMap<>();
    private final List<String> orderedIds = new CopyOnWriteArrayList<>();

    public LocalClaimStore(ObjectMapper objectMapper) {
        this(Path.of("target/claims"), objectMapper);
    }

    public LocalClaimStore(Path storageDir, ObjectMapper objectMapper) {
        this.storageDir = storageDir;
        this.objectMapper = objectMapper;
        initStorage();
    }

    private synchronized void initStorage() {
        try {
            Files.createDirectories(storageDir);
        } catch (IOException e) {
            log.error("Failed to create claim storage dir: {}", storageDir, e);
        }
    }

    @Override
    public synchronized ClaimBundle create(ClaimBundle bundle) {
        if (bundle == null || bundle.grading() == null || bundle.grading().claimId() == null) {
            throw new IllegalArgumentException("Cannot store claim bundle without valid claimId");
        }
        String id = bundle.grading().claimId();
        memoryIndex.put(id, bundle);
        if (!orderedIds.contains(id)) {
            orderedIds.add(0, id);
        }
        persistToFile(id, bundle);
        return bundle;
    }

    @Override
    public Optional<ClaimBundle> get(String claimId) {
        if (claimId == null) return Optional.empty();
        ClaimBundle cached = memoryIndex.get(claimId);
        if (cached != null) return Optional.of(cached);

        Path file = storageDir.resolve(claimId + ".json");
        if (Files.exists(file)) {
            try {
                ClaimBundle loaded = objectMapper.readValue(file.toFile(), ClaimBundle.class);
                memoryIndex.put(claimId, loaded);
                return Optional.of(loaded);
            } catch (Exception e) {
                log.error("Failed to read claim file for {}", claimId, e);
            }
        }
        return Optional.empty();
    }

    @Override
    public synchronized ClaimBundle update(ClaimBundle bundle) {
        return create(bundle);
    }

    @Override
    public List<ClaimBundle> listAll() {
        List<ClaimBundle> list = new ArrayList<>();
        for (String id : orderedIds) {
            ClaimBundle b = memoryIndex.get(id);
            if (b != null) list.add(b);
        }
        return Collections.unmodifiableList(list);
    }

    @Override
    public synchronized void clear() {
        memoryIndex.clear();
        orderedIds.clear();
    }

    private void persistToFile(String claimId, ClaimBundle bundle) {
        try {
            Path file = storageDir.resolve(claimId + ".json");
            objectMapper.writeValue(file.toFile(), bundle);
        } catch (Exception e) {
            log.warn("Failed to persist claim {} to file: {}", claimId, e.getMessage());
        }
    }
}
