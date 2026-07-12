package com.yupi.springbootinit.utils;

import java.awt.image.BufferedImage;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import javax.imageio.ImageIO;

public final class ImageDimensionUtils {

    private ImageDimensionUtils() {
    }

    public static int[] readFromUrl(String imageUrl) throws Exception {
        URLConnection connection = new URL(imageUrl).openConnection();
        connection.setConnectTimeout(5_000);
        connection.setReadTimeout(15_000);
        connection.setRequestProperty("User-Agent", "OwnAI-Image-DimensionProbe/1.0");
        try (InputStream inputStream = connection.getInputStream()) {
            BufferedImage image = ImageIO.read(inputStream);
            if (image == null || image.getWidth() <= 0 || image.getHeight() <= 0) {
                return null;
            }
            return new int[]{image.getWidth(), image.getHeight()};
        }
    }
}
