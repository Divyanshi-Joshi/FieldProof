package com.fieldproof.tools;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

/**
 * Utility to downscale images to ~768 px on the long edge using standard Java ImageIO,
 * optimizing bandwidth, latency, and token consumption.
 */
public final class ImageResizer {

    private static final Logger log = LoggerFactory.getLogger(ImageResizer.class);
    public static final int MAX_LONG_EDGE = 768;

    private ImageResizer() {}

    /**
     * Resizes the image to at most {@value #MAX_LONG_EDGE} pixels on the long edge.
     * Returns original bytes if already smaller or if image cannot be parsed by ImageIO.
     */
    public static byte[] resizeIfNeeded(byte[] inputBytes, String mimeType) {
        if (inputBytes == null || inputBytes.length == 0) {
            return inputBytes;
        }

        try {
            BufferedImage original = ImageIO.read(new ByteArrayInputStream(inputBytes));
            if (original == null) {
                return inputBytes; // Non-image or unrecognized format
            }

            int width = original.getWidth();
            int height = original.getHeight();

            int maxDim = Math.max(width, height);
            if (maxDim <= MAX_LONG_EDGE) {
                return inputBytes;
            }

            double scale = (double) MAX_LONG_EDGE / maxDim;
            int targetWidth = (int) Math.round(width * scale);
            int targetHeight = (int) Math.round(height * scale);

            BufferedImage scaled = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = scaled.createGraphics();
            try {
                g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                g2d.drawImage(original, 0, 0, targetWidth, targetHeight, null);
            } finally {
                g2d.dispose();
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            String formatName = (mimeType != null && mimeType.contains("png")) ? "png" : "jpeg";
            ImageIO.write(scaled, formatName, baos);
            byte[] resized = baos.toByteArray();

            log.debug("Downscaled photo from {}x{} ({} bytes) to {}x{} ({} bytes)",
                    width, height, inputBytes.length, targetWidth, targetHeight, resized.length);

            return resized;
        } catch (Exception e) {
            log.warn("Image resizing failed, proceeding with original bytes: {}", e.getMessage());
            return inputBytes;
        }
    }
}
