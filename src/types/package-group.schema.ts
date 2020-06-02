/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type PackageGroup = Package[];

export interface Package {
  subscriberPackageId?: string;
  subscriberPackageName: string;
  subscriberPackageNamespace?: string;
  /**
   * ID (starts with 04t) or alias of the package version to install
   */
  subscriberPackageVersionId: string;
  subscriberPackageVersionName?: string | number;
  subscriberPackageVersionNumber?: string | number;
  /**
   * compile all Apex in the org and package, or only Apex in the package
   */
  apexCompile?: "all" | "package";
  /**
   * number of minutes to wait for subscriber package version ID to become available in the target org
   */
  publishWait?: number;
  /**
   * installation key for key-protected package
   */
  installationKey?: string;
  /**
   * security access type for the installed package
   */
  securityType?: "AllUsers" | "AdminsOnly";
  /**
   * the upgrade type for the package installation
   */
  upgradeType?: "DeprecateOnly" | "Mixed" | "Delete";
  /**
   * number of minutes to wait for installation status
   */
  wait?: number;
}
