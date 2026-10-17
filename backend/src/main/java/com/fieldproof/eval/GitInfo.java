package com.fieldproof.eval;

public interface GitInfo {
    String getHeadCommitHash();
    boolean isClean();
}
