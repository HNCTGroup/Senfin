name := "SSWebUI"

version := "1.0-SNAPSHOT"

libraryDependencies ++= Seq(
  jdbc,
  anorm,
  cache
)     

play.Project.playScalaSettings

lessEntryPoints <<= baseDirectory { base => 
  (base / "app" / "assets" / "bootstrap" ** "bootstrap.less") +++
  (base / "app" / "assets" / "stylesheets" ** "*.less")
}

