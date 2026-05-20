package com.yupi.springbootinit.constant;

public interface FileConstant {

    String COS_HOST = System.getenv().getOrDefault("COS_HOST", "");
}
